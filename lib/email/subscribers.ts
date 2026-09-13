/**
 * Subscription lifecycle: subscribe -> verify -> preferences -> unsubscribe.
 *
 * Every state transition goes through this module so the rules are enforced in
 * exactly one place:
 *  - emails are normalised (trim + lowercase) before any lookup or write
 *  - a subscriber is only ever ACTIVE after clicking a verification link
 *  - verification links are hashed, single-use and expiring, with a resend
 *    cooldown and a hard attempt cap
 *  - the legacy `isActive` / `newPostAlerts` / `weeklyDigest` /
 *    `categoryUpdates` columns are kept in sync so existing dashboards and
 *    analytics queries keep working
 *  - every transition writes a `SubscriberEvent` audit row
 */

import type { BlogSubscriber, Prisma, SubscriberFrequency, SubscriberStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { EMAIL_LIMITS, absoluteUrl } from './config';
import { maskEmail, normalizeEmail, normalizeName, isValidEmail } from './address';
import { sendMail } from './client';
import {
    createTokenPair,
    deriveManageTokenPair,
    hashToken,
    isExpired,
    looksLikeToken,
    secondsSince,
    tokenExpiry,
} from './tokens';
import { renderUnsubscribedEmail, renderVerificationEmail, renderWelcomeEmail } from './templates';
import {
    BLOG_TOPIC_ORDER,
    isSubscriberFrequency,
    normalizeTopics,
    type BlogTopic,
} from './topics';

/* ------------------------------------------------------------------ */
/* URLs                                                                */
/* ------------------------------------------------------------------ */

export function buildVerifyUrl(token: string): string {
    return absoluteUrl(`/newsletter/verify?token=${encodeURIComponent(token)}`);
}

export function buildManageUrl(token: string): string {
    return absoluteUrl(`/newsletter/preferences?token=${encodeURIComponent(token)}`);
}

export function buildUnsubscribeUrl(token: string): string {
    return absoluteUrl(`/newsletter/preferences?token=${encodeURIComponent(token)}&action=unsubscribe`);
}

export function buildResubscribeUrl(): string {
    return absoluteUrl('/blog#subscribe');
}

/** Manage + unsubscribe links for a given subscriber id. */
export function subscriberLinks(subscriberId: string): { manageUrl: string; unsubscribeUrl: string } {
    const { token } = deriveManageTokenPair(subscriberId);
    return { manageUrl: buildManageUrl(token), unsubscribeUrl: buildUnsubscribeUrl(token) };
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export type SubscriberContext = {
    ip?: string | null;
    userAgent?: string | null;
    source?: string | null;
};

export type PreferenceInput = {
    name?: string | null;
    topics?: unknown;
    allTopics?: boolean;
    frequency?: unknown;
};

type NormalizedPreferences = {
    topics: BlogTopic[];
    allTopics: boolean;
    frequency: SubscriberFrequency;
};

export function normalizePreferences(
    input: PreferenceInput,
    fallback?: Partial<NormalizedPreferences>
): NormalizedPreferences {
    const topics = input.topics !== undefined ? normalizeTopics(input.topics) : fallback?.topics ?? [];

    const explicitAll = input.allTopics === true;
    const allTopics =
        explicitAll || topics.length === 0 || topics.length === BLOG_TOPIC_ORDER.length;

    const frequency = isSubscriberFrequency(input.frequency)
        ? (input.frequency as SubscriberFrequency)
        : fallback?.frequency ?? ('EVERY_POST' as SubscriberFrequency);

    return { topics, allTopics, frequency };
}

/** Columns mirrored from the new state machine onto the pre-existing schema. */
type LegacyMirror = {
    isActive: boolean;
    newPostAlerts: boolean;
    weeklyDigest: boolean;
    categoryUpdates: string | null;
};

/** Keeps the pre-existing columns consistent with the new state machine. */
function legacyMirror(status: SubscriberStatus, prefs: NormalizedPreferences): LegacyMirror {

    return {
        isActive: status === 'ACTIVE',
        newPostAlerts: prefs.frequency === 'EVERY_POST',
        weeklyDigest: prefs.frequency === 'WEEKLY_DIGEST',
        categoryUpdates: prefs.allTopics ? null : JSON.stringify(prefs.topics),
    };
}

export async function logSubscriberEvent(
    subscriberId: string,
    type: string,
    options: {
        actorType?: 'subscriber' | 'admin' | 'system';
        actorId?: string | null;
        metadata?: Record<string, unknown> | null;
    } = {}
): Promise<void> {
    try {
        await prisma.subscriberEvent.create({
            data: {
                subscriberId,
                type,
                actorType: options.actorType ?? 'subscriber',
                actorId: options.actorId ?? null,
                metadata: (options.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
            },
        });
    } catch (error) {
        // Audit logging must never break the user-facing flow.
        console.error('[email] failed to log subscriber event', { subscriberId, type, error });
    }
}

/** Client-safe projection of a subscriber. */
export type SubscriberSummary = {
    email: string;
    maskedEmail: string;
    name: string | null;
    status: SubscriberStatus;
    topics: BlogTopic[];
    allTopics: boolean;
    frequency: SubscriberFrequency;
    subscribedAt: string;
    verifiedAt: string | null;
};

export function toSubscriberSummary(subscriber: BlogSubscriber): SubscriberSummary {
    return {
        email: subscriber.email,
        maskedEmail: maskEmail(subscriber.email),
        name: subscriber.name,
        status: subscriber.status,
        topics: subscriber.topics as BlogTopic[],
        allTopics: subscriber.allTopics,
        frequency: subscriber.frequency,
        subscribedAt: subscriber.createdAt.toISOString(),
        verifiedAt: subscriber.verifiedAt ? subscriber.verifiedAt.toISOString() : null,
    };
}

/* ------------------------------------------------------------------ */
/* Verification email                                                  */
/* ------------------------------------------------------------------ */

async function issueVerification(
    subscriber: BlogSubscriber,
    options: { isResend?: boolean } = {}
): Promise<{ sent: boolean; error?: string }> {
    const { token, hash } = createTokenPair();
    const now = new Date();
    const expiresAt = tokenExpiry(EMAIL_LIMITS.verificationTtlHours, now);

    await prisma.blogSubscriber.update({
        where: { id: subscriber.id },
        data: {
            verificationTokenHash: hash,
            verificationSentAt: now,
            verificationExpiresAt: expiresAt,
            verificationCount: { increment: 1 },
        },
    });

    const email = renderVerificationEmail({
        name: subscriber.name,
        topics: subscriber.topics as BlogTopic[],
        allTopics: subscriber.allTopics,
        frequency: subscriber.frequency,
        verifyUrl: buildVerifyUrl(token),
        expiresHours: EMAIL_LIMITS.verificationTtlHours,
        isResend: options.isResend,
    });

    const result = await sendMail({
        to: subscriber.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        account: 'blog',
    });

    if (!result.success) {
        await logSubscriberEvent(subscriber.id, 'verification_send_failed', {
            actorType: 'system',
            metadata: { error: result.error },
        });
        return { sent: false, error: result.error };
    }

    await prisma.blogSubscriber.update({
        where: { id: subscriber.id },
        data: { lastEmailSentAt: new Date(), emailsSent: { increment: 1 } },
    });

    await logSubscriberEvent(subscriber.id, options.isResend ? 'verification_resent' : 'verification_sent', {
        metadata: { expiresAt: expiresAt.toISOString() },
    });

    return { sent: true };
}

/* ------------------------------------------------------------------ */
/* subscribe()                                                         */
/* ------------------------------------------------------------------ */

export type SubscribeState =
    | 'verification_sent'
    | 'verification_resent'
    | 'already_active'
    | 'cooldown'
    | 'invalid_email'
    | 'too_many_attempts'
    | 'send_failed'
    | 'error';

export type SubscribeResult = {
    ok: boolean;
    state: SubscribeState;
    message: string;
    email?: string;
    maskedEmail?: string;
    retryAfterSeconds?: number;
};

export type SubscribeInput = PreferenceInput & {
    email: string;
} & SubscriberContext;

export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
    const email = normalizeEmail(input.email);

    if (!isValidEmail(email)) {
        return {
            ok: false,
            state: 'invalid_email',
            message: 'That email address does not look right. Please check it and try again.',
        };
    }

    const name = normalizeName(input.name);
    const source = input.source?.trim().slice(0, 60) || 'blog';

    try {
        const existing = await prisma.blogSubscriber.findUnique({ where: { email } });

        /* --- brand new subscriber ------------------------------------ */
        if (!existing) {
            const prefs = normalizePreferences(input);

            let created: BlogSubscriber;
            try {
                created = await prisma.blogSubscriber.create({
                    data: {
                        email,
                        name,
                        status: 'PENDING',
                        topics: prefs.topics,
                        allTopics: prefs.allTopics,
                        frequency: prefs.frequency,
                        source,
                        ...legacyMirror('PENDING', prefs),
                    },
                });
            } catch (error) {
                // Someone submitted the same address twice at the same moment.
                if ((error as { code?: string }).code === 'P2002') {
                    const raced = await prisma.blogSubscriber.findUnique({ where: { email } });
                    if (raced) return handleExisting(raced, input, name, source);
                }
                throw error;
            }

            // Store the deterministic manage-token hash so preference links work.
            await prisma.blogSubscriber.update({
                where: { id: created.id },
                data: { manageTokenHash: deriveManageTokenPair(created.id).hash },
            });

            await logSubscriberEvent(created.id, 'subscribed', {
                metadata: {
                    source,
                    topics: prefs.topics,
                    allTopics: prefs.allTopics,
                    frequency: prefs.frequency,
                    ip: input.ip ?? null,
                    userAgent: input.userAgent?.slice(0, 200) ?? null,
                },
            });

            const sendResult = await issueVerification(created);
            if (!sendResult.sent) {
                return {
                    ok: false,
                    state: 'send_failed',
                    message:
                        'We saved your details but could not send the confirmation email. Please try again in a moment.',
                    email,
                    maskedEmail: maskEmail(email),
                };
            }

            return {
                ok: true,
                state: 'verification_sent',
                message: 'Check your inbox for the confirmation link.',
                email,
                maskedEmail: maskEmail(email),
            };
        }

        return handleExisting(existing, input, name, source);
    } catch (error) {
        console.error('[email] subscribe failed', { email: maskEmail(email), error });
        return {
            ok: false,
            state: 'error',
            message: 'Something went wrong on our side. Please try again shortly.',
        };
    }
}

async function handleExisting(
    existing: BlogSubscriber,
    input: SubscribeInput,
    name: string | null,
    source: string
): Promise<SubscribeResult> {
    const maskedEmail = maskEmail(existing.email);

    /* --- already confirmed --------------------------------------- */
    if (existing.status === 'ACTIVE') {
        await logSubscriberEvent(existing.id, 'subscribe_attempt_when_active', {
            metadata: { source },
        });
        return {
            ok: true,
            state: 'already_active',
            message: 'You are already subscribed - no need to do anything.',
            email: existing.email,
            maskedEmail,
        };
    }

    /* --- pending / unsubscribed / bounced: re-issue verification --- */
    if (existing.verificationCount >= EMAIL_LIMITS.maxVerificationSends) {
        return {
            ok: false,
            state: 'too_many_attempts',
            message:
                'We have sent a lot of confirmation emails to this address already. Please check your spam folder or contact support.',
            email: existing.email,
            maskedEmail,
        };
    }

    const elapsed = secondsSince(existing.verificationSentAt);
    if (elapsed < EMAIL_LIMITS.resendCooldownSeconds) {
        return {
            ok: false,
            state: 'cooldown',
            message: 'We just sent you a confirmation email. Give it a minute before requesting another.',
            email: existing.email,
            maskedEmail,
            retryAfterSeconds: EMAIL_LIMITS.resendCooldownSeconds - elapsed,
        };
    }

    // The address is unverified (or previously unsubscribed), so it is safe to
    // take the latest preferences the person typed.
    const prefs = normalizePreferences(input, {
        topics: existing.topics as BlogTopic[],
        allTopics: existing.allTopics,
        frequency: existing.frequency,
    });

    const wasUnsubscribed = existing.status === 'UNSUBSCRIBED' || existing.status === 'BOUNCED';

    const updated = await prisma.blogSubscriber.update({
        where: { id: existing.id },
        data: {
            name: name ?? existing.name,
            status: 'PENDING',
            topics: prefs.topics,
            allTopics: prefs.allTopics,
            frequency: prefs.frequency,
            source: existing.source ?? source,
            manageTokenHash: existing.manageTokenHash ?? deriveManageTokenPair(existing.id).hash,
            ...legacyMirror('PENDING', prefs),
        },
    });

    await logSubscriberEvent(updated.id, wasUnsubscribed ? 'resubscribe_requested' : 'subscribe_retry', {
        metadata: { source, topics: prefs.topics, allTopics: prefs.allTopics, frequency: prefs.frequency },
    });

    const sendResult = await issueVerification(updated, { isResend: true });
    if (!sendResult.sent) {
        return {
            ok: false,
            state: 'send_failed',
            message: 'We could not send the confirmation email just now. Please try again in a moment.',
            email: updated.email,
            maskedEmail,
        };
    }

    return {
        ok: true,
        state: 'verification_resent',
        message: 'We have re-sent your confirmation link - check your inbox.',
        email: updated.email,
        maskedEmail,
    };
}

/* ------------------------------------------------------------------ */
/* resendVerification()                                                */
/* ------------------------------------------------------------------ */

export type ResendResult = {
    ok: boolean;
    state: 'verification_resent' | 'already_active' | 'cooldown' | 'not_found' | 'too_many_attempts' | 'send_failed' | 'invalid_email' | 'error';
    message: string;
    retryAfterSeconds?: number;
    maskedEmail?: string;
};

export async function resendVerification(rawEmail: string): Promise<ResendResult> {
    const email = normalizeEmail(rawEmail);

    if (!isValidEmail(email)) {
        return { ok: false, state: 'invalid_email', message: 'Please enter a valid email address.' };
    }

    try {
        const subscriber = await prisma.blogSubscriber.findUnique({ where: { email } });

        if (!subscriber) {
            // Neutral response - never confirm whether an address is on the list.
            return {
                ok: true,
                state: 'not_found',
                message: 'If that address is waiting for confirmation, a new link is on its way.',
                maskedEmail: maskEmail(email),
            };
        }

        if (subscriber.status === 'ACTIVE') {
            return {
                ok: true,
                state: 'already_active',
                message: 'That address is already confirmed - you are all set.',
                maskedEmail: maskEmail(email),
            };
        }

        if (subscriber.verificationCount >= EMAIL_LIMITS.maxVerificationSends) {
            return {
                ok: false,
                state: 'too_many_attempts',
                message: 'Too many confirmation emails have been sent to this address. Please contact support.',
                maskedEmail: maskEmail(email),
            };
        }

        const elapsed = secondsSince(subscriber.verificationSentAt);
        if (elapsed < EMAIL_LIMITS.resendCooldownSeconds) {
            return {
                ok: false,
                state: 'cooldown',
                message: 'Hang on a moment before requesting another email.',
                retryAfterSeconds: EMAIL_LIMITS.resendCooldownSeconds - elapsed,
                maskedEmail: maskEmail(email),
            };
        }

        const sendResult = await issueVerification(subscriber, { isResend: true });
        if (!sendResult.sent) {
            return {
                ok: false,
                state: 'send_failed',
                message: 'We could not send that email just now. Please try again shortly.',
                maskedEmail: maskEmail(email),
            };
        }

        return {
            ok: true,
            state: 'verification_resent',
            message: 'A fresh confirmation link is on its way.',
            maskedEmail: maskEmail(email),
        };
    } catch (error) {
        console.error('[email] resendVerification failed', { email: maskEmail(email), error });
        return { ok: false, state: 'error', message: 'Something went wrong. Please try again shortly.' };
    }
}

/* ------------------------------------------------------------------ */
/* verifySubscription()                                                */
/* ------------------------------------------------------------------ */

export type VerifyResult = {
    ok: boolean;
    state: 'verified' | 'already_verified' | 'expired' | 'invalid' | 'error';
    message: string;
    subscriber?: SubscriberSummary;
    manageUrl?: string;
    email?: string;
};

export async function verifySubscription(rawToken: string): Promise<VerifyResult> {
    if (!looksLikeToken(rawToken)) {
        return { ok: false, state: 'invalid', message: 'This confirmation link is not valid.' };
    }

    try {
        const hash = hashToken(rawToken);
        const subscriber = await prisma.blogSubscriber.findUnique({
            where: { verificationTokenHash: hash },
        });

        if (!subscriber) {
            return {
                ok: false,
                state: 'invalid',
                message: 'This confirmation link is no longer valid. Request a new one below.',
            };
        }

        const { manageUrl, unsubscribeUrl } = subscriberLinks(subscriber.id);

        // Clicking the same link twice should feel successful, not broken.
        if (subscriber.status === 'ACTIVE') {
            return {
                ok: true,
                state: 'already_verified',
                message: 'Your subscription was already confirmed.',
                subscriber: toSubscriberSummary(subscriber),
                manageUrl,
                email: subscriber.email,
            };
        }

        if (isExpired(subscriber.verificationExpiresAt)) {
            await logSubscriberEvent(subscriber.id, 'verification_expired', { actorType: 'system' });
            return {
                ok: false,
                state: 'expired',
                message: 'That confirmation link has expired. We can send you a fresh one.',
                email: subscriber.email,
            };
        }

        const prefs: NormalizedPreferences = {
            topics: subscriber.topics as BlogTopic[],
            allTopics: subscriber.allTopics,
            frequency: subscriber.frequency,
        };

        const now = new Date();
        const activated = await prisma.blogSubscriber.update({
            where: { id: subscriber.id },
            data: {
                status: 'ACTIVE',
                verifiedAt: now,
                // Consumed: the link can no longer activate anything, but the
                // hash is kept so repeat clicks show a friendly message.
                verificationExpiresAt: null,
                unsubscribedAt: null,
                resubscribedAt: subscriber.unsubscribedAt ? now : subscriber.resubscribedAt,
                manageTokenHash: subscriber.manageTokenHash ?? deriveManageTokenPair(subscriber.id).hash,
                ...legacyMirror('ACTIVE', prefs),
            },
        });

        await logSubscriberEvent(activated.id, 'verified', {
            metadata: { topics: prefs.topics, allTopics: prefs.allTopics, frequency: prefs.frequency },
        });

        // Welcome email - failure here must not break the confirmation page.
        try {
            const welcome = renderWelcomeEmail({
                name: activated.name,
                topics: prefs.topics,
                allTopics: prefs.allTopics,
                frequency: prefs.frequency,
                manageUrl,
                unsubscribeUrl,
                latestArticles: await getLatestArticlesForWelcome(prefs),
            });

            const sent = await sendMail({
                to: activated.email,
                subject: welcome.subject,
                html: welcome.html,
                text: welcome.text,
                account: 'blog',
                unsubscribeUrl,
            });

            if (sent.success) {
                await prisma.blogSubscriber.update({
                    where: { id: activated.id },
                    data: { lastEmailSentAt: new Date(), emailsSent: { increment: 1 } },
                });
                await logSubscriberEvent(activated.id, 'welcome_sent', { actorType: 'system' });
            } else {
                await logSubscriberEvent(activated.id, 'welcome_failed', {
                    actorType: 'system',
                    metadata: { error: sent.error },
                });
            }
        } catch (error) {
            console.error('[email] welcome email failed', error);
        }

        return {
            ok: true,
            state: 'verified',
            message: 'Your subscription is confirmed.',
            subscriber: toSubscriberSummary(activated),
            manageUrl,
            email: activated.email,
        };
    } catch (error) {
        console.error('[email] verifySubscription failed', error);
        return { ok: false, state: 'error', message: 'Something went wrong confirming your subscription.' };
    }
}

/** Two recent posts to seed the welcome email (best effort). */
async function getLatestArticlesForWelcome(prefs: NormalizedPreferences) {
    try {
        const posts = await prisma.blogPost.findMany({
            where: {
                status: 'PUBLISHED',
                publishedAt: { not: null },
                ...(prefs.allTopics || prefs.topics.length === 0
                    ? {}
                    : { category: { in: prefs.topics } }),
            },
            orderBy: { publishedAt: 'desc' },
            take: 2,
            select: {
                title: true,
                slug: true,
                excerpt: true,
                featuredImage: true,
                category: true,
                readingTime: true,
                publishedAt: true,
                author: { select: { name: true } },
                authorProfile: { select: { username: true } },
            },
        });

        return posts.map((post) => ({
            title: post.title,
            url: buildArticleUrl(post.authorProfile?.username, post.author?.name, post.slug),
            excerpt: post.excerpt,
            imageUrl: post.featuredImage,
            category: post.category ?? null,
            readingTime: post.readingTime,
            publishedAt: post.publishedAt,
            authorName: post.author?.name ?? null,
        }));
    } catch {
        return [];
    }
}

/** Mirrors the public article route: /blog/[authorName]/[slug]. */
export function buildArticleUrl(
    username: string | null | undefined,
    authorName: string | null | undefined,
    slug: string
): string {
    const authorPath =
        username?.trim() ||
        (authorName ? authorName.toLowerCase().replace(/\s+/g, '-') : 'poultry-market');
    return absoluteUrl(`/blog/${encodeURIComponent(authorPath)}/${encodeURIComponent(slug)}`);
}

/* ------------------------------------------------------------------ */
/* Preferences by manage token                                         */
/* ------------------------------------------------------------------ */

export async function getSubscriberByManageToken(rawToken: string): Promise<BlogSubscriber | null> {
    if (!looksLikeToken(rawToken)) return null;
    return prisma.blogSubscriber.findUnique({ where: { manageTokenHash: hashToken(rawToken) } });
}

export type PreferencesResult = {
    ok: boolean;
    state: 'updated' | 'invalid' | 'error';
    message: string;
    subscriber?: SubscriberSummary;
};

export async function updatePreferencesByToken(
    rawToken: string,
    input: PreferenceInput
): Promise<PreferencesResult> {
    try {
        const subscriber = await getSubscriberByManageToken(rawToken);
        if (!subscriber) {
            return { ok: false, state: 'invalid', message: 'This preferences link is not valid.' };
        }

        const prefs = normalizePreferences(input, {
            topics: subscriber.topics as BlogTopic[],
            allTopics: subscriber.allTopics,
            frequency: subscriber.frequency,
        });

        // Someone updating preferences is opting back in.
        const status: SubscriberStatus = subscriber.status === 'ACTIVE' ? 'ACTIVE' : subscriber.status;

        const updated = await prisma.blogSubscriber.update({
            where: { id: subscriber.id },
            data: {
                name: input.name !== undefined ? normalizeName(input.name) : subscriber.name,
                topics: prefs.topics,
                allTopics: prefs.allTopics,
                frequency: prefs.frequency,
                ...legacyMirror(status, prefs),
            },
        });

        await logSubscriberEvent(updated.id, 'preferences_updated', {
            metadata: { topics: prefs.topics, allTopics: prefs.allTopics, frequency: prefs.frequency },
        });

        return {
            ok: true,
            state: 'updated',
            message: 'Your preferences have been saved.',
            subscriber: toSubscriberSummary(updated),
        };
    } catch (error) {
        console.error('[email] updatePreferencesByToken failed', error);
        return { ok: false, state: 'error', message: 'We could not save your preferences. Please try again.' };
    }
}

/* ------------------------------------------------------------------ */
/* Unsubscribe / resubscribe                                           */
/* ------------------------------------------------------------------ */

export type UnsubscribeResult = {
    ok: boolean;
    state: 'unsubscribed' | 'already_unsubscribed' | 'invalid' | 'error';
    message: string;
    resubscribeUrl?: string;
    email?: string;
};

export async function unsubscribeByToken(
    rawToken: string,
    options: { reason?: string | null; sendConfirmation?: boolean } = {}
): Promise<UnsubscribeResult> {
    try {
        const subscriber = await getSubscriberByManageToken(rawToken);
        if (!subscriber) {
            return { ok: false, state: 'invalid', message: 'This unsubscribe link is not valid.' };
        }

        if (subscriber.status === 'UNSUBSCRIBED') {
            return {
                ok: true,
                state: 'already_unsubscribed',
                message: 'You are already unsubscribed.',
                resubscribeUrl: buildResubscribeUrl(),
                email: subscriber.email,
            };
        }

        const prefs: NormalizedPreferences = {
            topics: subscriber.topics as BlogTopic[],
            allTopics: subscriber.allTopics,
            frequency: subscriber.frequency,
        };

        const updated = await prisma.blogSubscriber.update({
            where: { id: subscriber.id },
            data: {
                status: 'UNSUBSCRIBED',
                unsubscribedAt: new Date(),
                ...legacyMirror('UNSUBSCRIBED', prefs),
            },
        });

        await logSubscriberEvent(updated.id, 'unsubscribed', {
            metadata: { reason: options.reason ?? null },
        });

        if (options.sendConfirmation !== false) {
            try {
                const goodbye = renderUnsubscribedEmail({
                    name: updated.name,
                    resubscribeUrl: buildResubscribeUrl(),
                });
                await sendMail({
                    to: updated.email,
                    subject: goodbye.subject,
                    html: goodbye.html,
                    text: goodbye.text,
                    account: 'blog',
                });
            } catch (error) {
                console.error('[email] unsubscribe confirmation failed', error);
            }
        }

        return {
            ok: true,
            state: 'unsubscribed',
            message: 'You have been unsubscribed.',
            resubscribeUrl: buildResubscribeUrl(),
            email: updated.email,
        };
    } catch (error) {
        console.error('[email] unsubscribeByToken failed', error);
        return { ok: false, state: 'error', message: 'We could not process that request. Please try again.' };
    }
}

export async function resubscribeByToken(rawToken: string): Promise<PreferencesResult> {
    try {
        const subscriber = await getSubscriberByManageToken(rawToken);
        if (!subscriber) {
            return { ok: false, state: 'invalid', message: 'This link is not valid.' };
        }

        const prefs: NormalizedPreferences = {
            topics: subscriber.topics as BlogTopic[],
            allTopics: subscriber.allTopics,
            frequency: subscriber.frequency,
        };

        // They proved ownership of the inbox by using a link we mailed them,
        // so no second confirmation round-trip is needed.
        const updated = await prisma.blogSubscriber.update({
            where: { id: subscriber.id },
            data: {
                status: 'ACTIVE',
                verifiedAt: subscriber.verifiedAt ?? new Date(),
                resubscribedAt: new Date(),
                unsubscribedAt: null,
                ...legacyMirror('ACTIVE', prefs),
            },
        });

        await logSubscriberEvent(updated.id, 'resubscribed', {});

        return {
            ok: true,
            state: 'updated',
            message: 'Welcome back - your subscription is active again.',
            subscriber: toSubscriberSummary(updated),
        };
    } catch (error) {
        console.error('[email] resubscribeByToken failed', error);
        return { ok: false, state: 'error', message: 'We could not complete that. Please try again.' };
    }
}

/** Used by bounce handling / admin tooling. */
export async function markBounced(email: string, reason?: string): Promise<void> {
    const normalized = normalizeEmail(email);
    const subscriber = await prisma.blogSubscriber.findUnique({ where: { email: normalized } });
    if (!subscriber) return;

    const bounceCount = subscriber.bounceCount + 1;
    const shouldSuppress = bounceCount >= 3;

    await prisma.blogSubscriber.update({
        where: { id: subscriber.id },
        data: {
            bounceCount,
            ...(shouldSuppress ? { status: 'BOUNCED', isActive: false } : {}),
        },
    });

    await logSubscriberEvent(subscriber.id, shouldSuppress ? 'bounced_suppressed' : 'bounced', {
        actorType: 'system',
        metadata: { reason: reason ?? null, bounceCount },
    });
}
