/**
 * Campaign engine - the asynchronous side of the email system.
 *
 * Nothing is ever sent inside the HTTP request that triggers it. Instead we:
 *   1. create an `EmailCampaign` row (the "what")
 *   2. expand the audience into one `EmailDelivery` row per recipient (the "who")
 *   3. drain those deliveries in small batches, from a cron job or a
 *      fire-and-forget call, with retries and per-recipient status
 *
 * Duplicate protection is enforced by the database:
 *   - `@@unique([campaignId, email])` on EmailDelivery  -> one email per person
 *   - `@@unique([blogPostId, type])`  on EmailCampaign  -> one campaign per post
 * and by an atomic "claim" update before each send, so two overlapping drains
 * can never send the same message twice.
 */

import type {
    EmailCampaign,
    EmailCampaignStatus,
    EmailCampaignType,
    Prisma,
    SubscriberFrequency,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { MailerAccount } from '@/lib/email';
import { EMAIL_LIMITS, absoluteUrl, isMailerAccount } from './config';
import { isValidEmail, normalizeEmail, normalizeName } from './address';
import { sendMail, sleep } from './client';
import type { EmailArticle } from './layout';
import {
    renderBlogNotificationEmail,
    renderCampaignEmail,
    renderWeeklyDigestEmail,
    type RenderedEmail,
} from './templates';
import { buildArticleUrl, markBounced, subscriberLinks } from './subscribers';
import { normalizeTopics, type BlogTopic } from './topics';
import { getEmailSettings } from './settings';

/** Resend's default account limit is ~2 requests/second. */
const PER_EMAIL_DELAY_MS = 550;
/** A delivery stuck in SENDING for longer than this is considered abandoned. */
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
/** Default wall-clock budget for one drain pass (serverless friendly). */
const DEFAULT_TIME_BUDGET_MS = 45_000;

/* ------------------------------------------------------------------ */
/* Audience                                                            */
/* ------------------------------------------------------------------ */

export type CampaignAudience = {
    kind: 'subscribers' | 'users' | 'custom';
    /** Subscribers: only people following at least one of these topics. */
    topics?: BlogTopic[];
    /** Subscribers: only these cadences (defaults to all). */
    frequencies?: SubscriberFrequency[];
    /** Users: a UserRole, or 'ALL'. */
    role?: string;
    /** Users: only verified accounts. */
    verifiedOnly?: boolean;
    /** Custom: explicit address list. */
    emails?: string[];
    /** Weekly digest: the posts to render. */
    postIds?: string[];
    /** Weekly digest: "this week", "in June" ... */
    periodLabel?: string;
    /** Human readable description shown in the admin UI. */
    label?: string;
};

export type CampaignRecipient = {
    email: string;
    name: string | null;
    subscriberId: string | null;
    userId: string | null;
};

function readAudience(value: unknown): CampaignAudience {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const audience = value as CampaignAudience;
        if (audience.kind === 'subscribers' || audience.kind === 'users' || audience.kind === 'custom') {
            return audience;
        }
    }
    return { kind: 'subscribers' };
}

/** Expands an audience definition into a de-duplicated recipient list. */
export async function resolveAudience(audience: CampaignAudience): Promise<CampaignRecipient[]> {
    const seen = new Set<string>();
    const recipients: CampaignRecipient[] = [];

    const push = (recipient: CampaignRecipient) => {
        const email = normalizeEmail(recipient.email);
        if (!isValidEmail(email) || seen.has(email)) return;
        seen.add(email);
        recipients.push({ ...recipient, email });
    };

    if (audience.kind === 'users') {
        const users = await prisma.user.findMany({
            where: {
                ...(audience.role && audience.role !== 'ALL'
                    ? { role: audience.role as Prisma.UserWhereInput['role'] }
                    : {}),
                ...(audience.verifiedOnly ? { isVerified: true } : {}),
            },
            select: { id: true, email: true, name: true },
            take: EMAIL_LIMITS.maxRecipientsPerCampaign,
        });

        for (const user of users) {
            push({ email: user.email, name: user.name ?? null, subscriberId: null, userId: user.id });
        }
        return recipients;
    }

    if (audience.kind === 'custom') {
        const emails = (audience.emails ?? []).map(normalizeEmail).filter(isValidEmail);
        if (!emails.length) return recipients;

        // Attach subscriber ids where we know them so the footer links work.
        const known = await prisma.blogSubscriber.findMany({
            where: { email: { in: emails.slice(0, 1000) } },
            select: { id: true, email: true, name: true },
        });
        const bySubscriberEmail = new Map(known.map((s) => [s.email, s]));

        for (const email of emails) {
            const match = bySubscriberEmail.get(email);
            push({
                email,
                name: match?.name ?? null,
                subscriberId: match?.id ?? null,
                userId: null,
            });
        }
        return recipients;
    }

    /* --- subscribers (the default) --------------------------------- */
    const topics = normalizeTopics(audience.topics);
    const frequencies = audience.frequencies?.length ? audience.frequencies : undefined;

    const subscribers = await prisma.blogSubscriber.findMany({
        where: {
            status: 'ACTIVE',
            ...(frequencies ? { frequency: { in: frequencies } } : {}),
            ...(topics.length
                ? { OR: [{ allTopics: true }, { topics: { hasSome: topics } }] }
                : {}),
        },
        select: { id: true, email: true, name: true },
        take: EMAIL_LIMITS.maxRecipientsPerCampaign,
    });

    for (const subscriber of subscribers) {
        push({
            email: subscriber.email,
            name: subscriber.name,
            subscriberId: subscriber.id,
            userId: null,
        });
    }

    return recipients;
}

/* ------------------------------------------------------------------ */
/* Creating + queueing                                                 */
/* ------------------------------------------------------------------ */

export type CreateCampaignInput = {
    type: EmailCampaignType;
    subject: string;
    content: string;
    previewText?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    imageUrl?: string | null;
    audience: CampaignAudience;
    topics?: BlogTopic[];
    blogPostId?: string | null;
    senderAccount?: MailerAccount | string | null;
    senderName?: string | null;
    createdById?: string | null;
};

export async function createCampaign(input: CreateCampaignInput): Promise<EmailCampaign> {
    const settings = await getEmailSettings();

    return prisma.emailCampaign.create({
        data: {
            type: input.type,
            status: 'DRAFT',
            subject: input.subject.trim().slice(0, 200),
            previewText: input.previewText?.trim().slice(0, 200) || null,
            content: input.content,
            ctaLabel: input.ctaLabel?.trim().slice(0, 60) || null,
            ctaUrl: input.ctaUrl?.trim() || null,
            imageUrl: input.imageUrl?.trim() || null,
            audience: input.audience as unknown as Prisma.InputJsonValue,
            topics: normalizeTopics(input.topics),
            blogPostId: input.blogPostId ?? null,
            senderAccount: isMailerAccount(input.senderAccount)
                ? input.senderAccount
                : settings.defaultSenderAccount,
            senderName: input.senderName?.trim().slice(0, 80) || settings.defaultSenderName,
            createdById: input.createdById ?? null,
        },
    });
}

/** Expands the audience into delivery rows and marks the campaign QUEUED. */
export async function queueCampaign(campaignId: string): Promise<{ campaign: EmailCampaign; total: number }> {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    if (campaign.status === 'SENDING' || campaign.status === 'SENT') {
        return { campaign, total: campaign.totalRecipients };
    }

    const recipients = await resolveAudience(readAudience(campaign.audience));

    // `skipDuplicates` + the unique index guarantee one row per address even if
    // this function is called twice for the same campaign.
    const CHUNK = 500;
    for (let i = 0; i < recipients.length; i += CHUNK) {
        const chunk = recipients.slice(i, i + CHUNK);
        await prisma.emailDelivery.createMany({
            data: chunk.map((recipient) => ({
                campaignId: campaign.id,
                email: recipient.email,
                recipientName: recipient.name,
                subscriberId: recipient.subscriberId,
                userId: recipient.userId,
                status: 'PENDING' as const,
            })),
            skipDuplicates: true,
        });
    }

    const total = await prisma.emailDelivery.count({ where: { campaignId: campaign.id } });

    const updated = await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: {
            status: total > 0 ? 'QUEUED' : 'SENT',
            totalRecipients: total,
            queuedAt: new Date(),
            ...(total === 0 ? { completedAt: new Date() } : {}),
        },
    });

    return { campaign: updated, total };
}

export async function createAndQueueCampaign(
    input: CreateCampaignInput
): Promise<{ campaign: EmailCampaign; total: number }> {
    const campaign = await createCampaign(input);
    return queueCampaign(campaign.id);
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

type RenderContext = {
    article?: EmailArticle | null;
    articleTopic?: BlogTopic | null;
    alsoRead: EmailArticle[];
    digestArticles: EmailArticle[];
    periodLabel?: string;
    footerNote: string;
};

type PostForEmail = {
    title: string;
    slug: string;
    excerpt: string | null;
    featuredImage: string | null;
    category: BlogTopic;
    readingTime: number | null;
    estimatedReadTime: number | null;
    publishedAt: Date | null;
    author: { name: string } | null;
    authorProfile: { username: string } | null;
};

const POST_SELECT = {
    title: true,
    slug: true,
    excerpt: true,
    featuredImage: true,
    category: true,
    readingTime: true,
    estimatedReadTime: true,
    publishedAt: true,
    author: { select: { name: true } },
    authorProfile: { select: { username: true } },
} as const;

export function postToEmailArticle(post: PostForEmail): EmailArticle {
    return {
        title: post.title,
        url: buildArticleUrl(post.authorProfile?.username, post.author?.name, post.slug),
        excerpt: post.excerpt,
        imageUrl: post.featuredImage,
        category: post.category,
        authorName: post.author?.name ?? null,
        readingTime: post.estimatedReadTime ?? post.readingTime ?? null,
        publishedAt: post.publishedAt,
    };
}

async function buildRenderContext(campaign: EmailCampaign): Promise<RenderContext> {
    const settings = await getEmailSettings();
    const audience = readAudience(campaign.audience);
    const context: RenderContext = {
        alsoRead: [],
        digestArticles: [],
        periodLabel: audience.periodLabel,
        footerNote: settings.footerNote,
    };

    if (campaign.type === 'BLOG_NOTIFICATION' && campaign.blogPostId) {
        const post = await prisma.blogPost.findUnique({
            where: { id: campaign.blogPostId },
            select: POST_SELECT,
        });

        if (post) {
            context.article = postToEmailArticle(post);
            context.articleTopic = post.category;

            const others = await prisma.blogPost.findMany({
                where: {
                    id: { not: campaign.blogPostId },
                    status: 'PUBLISHED',
                    publishedAt: { not: null },
                    category: post.category,
                },
                orderBy: { publishedAt: 'desc' },
                take: 2,
                select: POST_SELECT,
            });
            context.alsoRead = others.map(postToEmailArticle);
        }
    }

    if (campaign.type === 'WEEKLY_DIGEST' && audience.postIds?.length) {
        const posts = await prisma.blogPost.findMany({
            where: { id: { in: audience.postIds } },
            orderBy: { publishedAt: 'desc' },
            select: POST_SELECT,
        });
        context.digestArticles = posts.map(postToEmailArticle);
    }

    return context;
}

function renderForRecipient(
    campaign: EmailCampaign,
    context: RenderContext,
    recipient: { email: string; name: string | null; subscriberId: string | null }
): { rendered: RenderedEmail; unsubscribeUrl: string | null } {
    const links = recipient.subscriberId ? subscriberLinks(recipient.subscriberId) : null;
    const manageUrl = links?.manageUrl ?? null;
    const unsubscribeUrl = links?.unsubscribeUrl ?? null;

    if (campaign.type === 'BLOG_NOTIFICATION' && context.article && manageUrl && unsubscribeUrl) {
        return {
            rendered: renderBlogNotificationEmail({
                name: recipient.name,
                article: context.article,
                topic: context.articleTopic,
                manageUrl,
                unsubscribeUrl,
                alsoRead: context.alsoRead,
            }),
            unsubscribeUrl,
        };
    }

    if (campaign.type === 'WEEKLY_DIGEST' && context.digestArticles.length && manageUrl && unsubscribeUrl) {
        return {
            rendered: renderWeeklyDigestEmail({
                name: recipient.name,
                articles: context.digestArticles,
                manageUrl,
                unsubscribeUrl,
                periodLabel: context.periodLabel,
            }),
            unsubscribeUrl,
        };
    }

    return {
        rendered: renderCampaignEmail({
            name: recipient.name,
            subject: campaign.subject,
            content: campaign.content,
            previewText: campaign.previewText,
            ctaLabel: campaign.ctaLabel,
            ctaUrl: campaign.ctaUrl,
            imageUrl: campaign.imageUrl,
            manageUrl,
            unsubscribeUrl,
        }),
        unsubscribeUrl,
    };
}

/** Admin "preview" rendering - no database writes, no sending. */
export function renderCampaignPreview(input: {
    subject: string;
    content: string;
    previewText?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    imageUrl?: string | null;
    recipientName?: string | null;
}): RenderedEmail {
    return renderCampaignEmail({
        name: input.recipientName ?? 'Wanjiku',
        subject: input.subject || '(no subject)',
        content: input.content,
        previewText: input.previewText,
        ctaLabel: input.ctaLabel,
        ctaUrl: input.ctaUrl,
        imageUrl: input.imageUrl,
        manageUrl: absoluteUrl('/newsletter/preferences?token=preview'),
        unsubscribeUrl: absoluteUrl('/newsletter/preferences?token=preview&action=unsubscribe'),
    });
}

/* ------------------------------------------------------------------ */
/* Draining                                                            */
/* ------------------------------------------------------------------ */

export type ProcessResult = {
    campaignId: string;
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
    remaining: number;
    status: EmailCampaignStatus;
    finished: boolean;
};

function pendingWhere(campaignId: string): Prisma.EmailDeliveryWhereInput {
    return {
        campaignId,
        OR: [
            { status: 'PENDING' },
            { status: 'FAILED', attempts: { lt: EMAIL_LIMITS.maxDeliveryAttempts } },
            // Recover deliveries abandoned by a crashed/timed-out run.
            { status: 'SENDING', lastAttemptAt: { lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) } },
        ],
    };
}

/**
 * Sends as much of a campaign as fits in the time budget.
 * Safe to call concurrently - every delivery is claimed atomically.
 */
export async function processCampaign(
    campaignId: string,
    options: { timeBudgetMs?: number; maxRecipients?: number } = {}
): Promise<ProcessResult> {
    const timeBudgetMs = options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
    const deadline = Date.now() + timeBudgetMs;

    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    if (campaign.status === 'CANCELLED' || campaign.status === 'DRAFT') {
        return {
            campaignId,
            processed: 0,
            sent: 0,
            failed: 0,
            skipped: 0,
            remaining: 0,
            status: campaign.status,
            finished: false,
        };
    }

    if (campaign.status === 'QUEUED') {
        await prisma.emailCampaign.update({
            where: { id: campaignId },
            data: { status: 'SENDING', startedAt: campaign.startedAt ?? new Date() },
        });
    }

    const context = await buildRenderContext(campaign);

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    while (Date.now() < deadline) {
        if (options.maxRecipients && processed >= options.maxRecipients) break;

        const batch = await prisma.emailDelivery.findMany({
            where: pendingWhere(campaignId),
            orderBy: { createdAt: 'asc' },
            take: EMAIL_LIMITS.batchSize,
            include: { subscriber: { select: { status: true } } },
        });

        if (!batch.length) break;

        let progressed = false;

        for (const delivery of batch) {
            if (Date.now() >= deadline) break;
            if (options.maxRecipients && processed >= options.maxRecipients) break;

            // Never mail someone who opted out after the campaign was queued.
            if (delivery.subscriber && delivery.subscriber.status !== 'ACTIVE') {
                const claimed = await prisma.emailDelivery.updateMany({
                    where: { id: delivery.id, status: { in: ['PENDING', 'FAILED', 'SENDING'] } },
                    data: { status: 'SKIPPED', error: 'Recipient is no longer an active subscriber' },
                });
                if (claimed.count) {
                    skipped += 1;
                    processed += 1;
                    progressed = true;
                }
                continue;
            }

            // Atomic claim: whoever flips the row to SENDING owns the send.
            const claim = await prisma.emailDelivery.updateMany({
                where: {
                    id: delivery.id,
                    status: delivery.status,
                    attempts: delivery.attempts,
                },
                data: {
                    status: 'SENDING',
                    attempts: { increment: 1 },
                    lastAttemptAt: new Date(),
                },
            });

            if (!claim.count) continue; // another worker got there first

            progressed = true;
            processed += 1;

            const { rendered, unsubscribeUrl } = renderForRecipient(campaign, context, {
                email: delivery.email,
                name: delivery.recipientName,
                subscriberId: delivery.subscriberId,
            });

            const result = await sendMail({
                to: delivery.email,
                subject: campaign.subject || rendered.subject,
                html: rendered.html,
                text: rendered.text,
                account: isMailerAccount(campaign.senderAccount) ? campaign.senderAccount : 'blog',
                senderName: campaign.senderName ?? undefined,
                unsubscribeUrl: unsubscribeUrl ?? undefined,
            });

            if (result.success) {
                sent += 1;
                await prisma.emailDelivery.update({
                    where: { id: delivery.id },
                    data: {
                        status: 'SENT',
                        sentAt: new Date(),
                        providerMessageId: result.messageId,
                        error: null,
                    },
                });

                if (delivery.subscriberId) {
                    await prisma.blogSubscriber.update({
                        where: { id: delivery.subscriberId },
                        data: { lastEmailSentAt: new Date(), emailsSent: { increment: 1 } },
                    });
                }
            } else {
                failed += 1;
                await prisma.emailDelivery.update({
                    where: { id: delivery.id },
                    data: { status: 'FAILED', error: result.error.slice(0, 500) },
                });

                // Hard bounce style failures suppress the address.
                if (
                    delivery.subscriberId &&
                    !result.retryable &&
                    /invalid|does not exist|unknown|not found|bounce/i.test(result.error)
                ) {
                    await markBounced(delivery.email, result.error.slice(0, 200));
                }
            }

            await sleep(PER_EMAIL_DELAY_MS);
        }

        if (!progressed) break; // everything in this batch is owned elsewhere

        await prisma.emailCampaign.update({
            where: { id: campaignId },
            data: { sentCount: { increment: 0 } }, // touch updatedAt for live progress
        });

        await sleep(EMAIL_LIMITS.batchDelayMs);
    }

    return finalizeCampaign(campaignId, { processed, sent, failed, skipped });
}

/** Recomputes authoritative counters and closes the campaign when it is done. */
async function finalizeCampaign(
    campaignId: string,
    run: { processed: number; sent: number; failed: number; skipped: number }
): Promise<ProcessResult> {
    const [sentCount, failedCount, remaining] = await Promise.all([
        prisma.emailDelivery.count({ where: { campaignId, status: 'SENT' } }),
        prisma.emailDelivery.count({ where: { campaignId, status: 'FAILED' } }),
        prisma.emailDelivery.count({ where: pendingWhere(campaignId) }),
    ]);

    let status: EmailCampaignStatus = 'SENDING';
    let completedAt: Date | null = null;

    if (remaining === 0) {
        if (failedCount === 0) status = 'SENT';
        else if (sentCount === 0) status = 'FAILED';
        else status = 'PARTIALLY_FAILED';
        completedAt = new Date();
    }

    const current = await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
    });

    const nextStatus = current?.status === 'CANCELLED' ? 'CANCELLED' : status;

    await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
            sentCount,
            failedCount,
            status: nextStatus,
            ...(completedAt && nextStatus !== 'CANCELLED' ? { completedAt } : {}),
        },
    });

    return {
        campaignId,
        processed: run.processed,
        sent: run.sent,
        failed: run.failed,
        skipped: run.skipped,
        remaining,
        status: nextStatus,
        finished: remaining === 0,
    };
}

/** Cron entry point: works through every campaign that still has deliveries. */
export async function drainPendingCampaigns(
    options: { timeBudgetMs?: number; maxCampaigns?: number } = {}
): Promise<{ campaigns: ProcessResult[]; drained: number }> {
    const timeBudgetMs = options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
    const deadline = Date.now() + timeBudgetMs;
    const maxCampaigns = options.maxCampaigns ?? 5;

    const campaigns = await prisma.emailCampaign.findMany({
        where: { status: { in: ['QUEUED', 'SENDING', 'PARTIALLY_FAILED'] } },
        orderBy: { queuedAt: 'asc' },
        take: maxCampaigns,
        select: { id: true },
    });

    const results: ProcessResult[] = [];

    for (const campaign of campaigns) {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 2_000) break;

        try {
            results.push(await processCampaign(campaign.id, { timeBudgetMs: remainingMs }));
        } catch (error) {
            console.error('[email:campaigns] drain failed', { campaignId: campaign.id, error });
        }
    }

    return { campaigns: results, drained: results.length };
}

/** Admin action: reset failures and run the campaign again. */
export async function retryCampaign(
    campaignId: string,
    options: { timeBudgetMs?: number } = {}
): Promise<ProcessResult> {
    await prisma.emailDelivery.updateMany({
        where: { campaignId, status: { in: ['FAILED', 'SKIPPED'] } },
        data: { status: 'PENDING', attempts: 0, error: null },
    });

    await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'QUEUED', completedAt: null },
    });

    return processCampaign(campaignId, options);
}

export async function cancelCampaign(campaignId: string): Promise<EmailCampaign> {
    await prisma.emailDelivery.updateMany({
        where: { campaignId, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'SKIPPED', error: 'Campaign cancelled' },
    });

    return prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'CANCELLED', completedAt: new Date() },
    });
}

/* ------------------------------------------------------------------ */
/* Stats + test sends                                                  */
/* ------------------------------------------------------------------ */

export type CampaignStats = {
    total: number;
    pending: number;
    sending: number;
    sent: number;
    failed: number;
    skipped: number;
};

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const [total, pending, sending, sent, failed, skipped] = await Promise.all([
        prisma.emailDelivery.count({ where: { campaignId } }),
        prisma.emailDelivery.count({ where: { campaignId, status: 'PENDING' } }),
        prisma.emailDelivery.count({ where: { campaignId, status: 'SENDING' } }),
        prisma.emailDelivery.count({ where: { campaignId, status: 'SENT' } }),
        prisma.emailDelivery.count({ where: { campaignId, status: 'FAILED' } }),
        prisma.emailDelivery.count({ where: { campaignId, status: 'SKIPPED' } }),
    ]);

    return { total, pending, sending, sent, failed, skipped };
}

/** Sends a one-off preview of a draft (or an existing campaign) to one address. */
export async function sendCampaignTest(input: {
    to: string;
    subject: string;
    content: string;
    previewText?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    imageUrl?: string | null;
    recipientName?: string | null;
    senderAccount?: MailerAccount | string | null;
    senderName?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    const to = normalizeEmail(input.to);
    if (!isValidEmail(to)) {
        return { success: false, error: 'Enter a valid test recipient address.' };
    }

    const settings = await getEmailSettings();

    const rendered = renderCampaignEmail({
        name: normalizeName(input.recipientName) ?? 'there',
        subject: input.subject || '(no subject)',
        content: input.content,
        previewText: input.previewText,
        ctaLabel: input.ctaLabel,
        ctaUrl: input.ctaUrl,
        imageUrl: input.imageUrl,
        manageUrl: absoluteUrl('/newsletter/preferences?token=preview'),
        unsubscribeUrl: absoluteUrl('/newsletter/preferences?token=preview&action=unsubscribe'),
        isTest: true,
    });

    const result = await sendMail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        account: isMailerAccount(input.senderAccount) ? input.senderAccount : settings.defaultSenderAccount,
        senderName: input.senderName ?? settings.defaultSenderName,
    });

    return result.success ? { success: true } : { success: false, error: result.error };
}
