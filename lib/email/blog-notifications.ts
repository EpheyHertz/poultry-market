/**
 * Turns a freshly published blog post into an email campaign.
 *
 * This is the bridge between the blog publishing flow and the async campaign
 * engine. It is intentionally:
 *   - idempotent: the `@@unique([blogPostId, type])` index means calling it
 *     twice for the same post reuses the existing campaign instead of mailing
 *     everyone again
 *   - safe to fire-and-forget: it never throws, so a mail hiccup can never
 *     block or fail the "publish post" request
 *   - respectful of settings: honours the `blogNotificationsEnabled` toggle
 *
 * Recipients are the ACTIVE subscribers who either follow every topic or who
 * ticked the post's category, and whose cadence is "every post".
 */

import { prisma } from '@/lib/prisma';
import type { BlogTopic } from './topics';
import { getEmailSettings } from './settings';
import {
    createCampaign,
    processCampaign,
    queueCampaign,
    type ProcessResult,
} from './campaigns';

export type EnqueueResult = {
    ok: boolean;
    reason:
    | 'queued'
    | 'already_exists'
    | 'not_published'
    | 'not_found'
    | 'no_recipients'
    | 'disabled'
    | 'error';
    campaignId?: string;
    total?: number;
};

/**
 * Creates (or reuses) the BLOG_NOTIFICATION campaign for a post and queues its
 * deliveries. Does NOT block on sending - the cron drain (or the optional
 * `kick` flag) delivers the mail in the background.
 */
export async function enqueueBlogPostNotification(
    postId: string,
    options: { kick?: boolean } = {}
): Promise<EnqueueResult> {
    try {
        const settings = await getEmailSettings();
        if (!settings.blogNotificationsEnabled) {
            return { ok: false, reason: 'disabled' };
        }

        const post = await prisma.blogPost.findUnique({
            where: { id: postId },
            select: {
                id: true,
                title: true,
                excerpt: true,
                status: true,
                category: true,
                publishedAt: true,
            },
        });

        if (!post) return { ok: false, reason: 'not_found' };
        if (post.status !== 'PUBLISHED') return { ok: false, reason: 'not_published' };

        // Reuse an existing campaign for this post if one already exists.
        const existing = await prisma.emailCampaign.findFirst({
            where: { blogPostId: post.id, type: 'BLOG_NOTIFICATION' },
            select: { id: true, status: true, totalRecipients: true },
        });

        if (existing) {
            // If it never got queued (e.g. created then crashed), queue it now.
            if (existing.status === 'DRAFT') {
                const { total } = await queueCampaign(existing.id);
                if (options.kick && total > 0) void kickDrain(existing.id);
                return {
                    ok: total > 0,
                    reason: total > 0 ? 'queued' : 'no_recipients',
                    campaignId: existing.id,
                    total,
                };
            }
            return {
                ok: true,
                reason: 'already_exists',
                campaignId: existing.id,
                total: existing.totalRecipients,
            };
        }

        const topic = post.category as BlogTopic;

        const campaign = await createCampaign({
            type: 'BLOG_NOTIFICATION',
            subject: post.title.slice(0, 200),
            previewText: post.excerpt?.slice(0, 200) ?? null,
            // Content is generated from the post at send time; this is a fallback.
            content: post.excerpt || `A new article is live: ${post.title}`,
            audience: {
                kind: 'subscribers',
                topics: [topic],
                frequencies: ['EVERY_POST'],
                label: `New post: ${post.title}`,
            },
            topics: [topic],
            blogPostId: post.id,
            senderAccount: settings.defaultSenderAccount,
            senderName: settings.defaultSenderName,
        });

        const { total } = await queueCampaign(campaign.id);

        if (total === 0) {
            return { ok: false, reason: 'no_recipients', campaignId: campaign.id, total };
        }

        if (options.kick) void kickDrain(campaign.id);

        return { ok: true, reason: 'queued', campaignId: campaign.id, total };
    } catch (error) {
        console.error('[email:blog-notifications] enqueue failed', { postId, error });
        return { ok: false, reason: 'error' };
    }
}

/**
 * Best-effort background send used by the publish hooks. Swallows every error
 * and never returns a rejected promise, so callers can safely `void` it.
 */
async function kickDrain(campaignId: string): Promise<ProcessResult | null> {
    try {
        return await processCampaign(campaignId, { timeBudgetMs: 20_000 });
    } catch (error) {
        console.error('[email:blog-notifications] kick drain failed', { campaignId, error });
        return null;
    }
}

/**
 * Fire-and-forget wrapper for use directly inside publish route handlers.
 * Usage: `void notifyOnPublish(post.id)` right after a post becomes PUBLISHED.
 */
export function notifyOnPublish(postId: string): void {
    enqueueBlogPostNotification(postId, { kick: true }).catch((error) => {
        console.error('[email:blog-notifications] notifyOnPublish failed', { postId, error });
    });
}
