import { prisma } from '@/lib/prisma';
import { getEmailSettings } from './settings';
import { createCampaign, queueCampaign } from './campaigns';
import type { EmailCampaign } from '@prisma/client';

export type WeeklyDigestAudience = 'verified_users' | 'subscribers' | 'all';

export type BuildWeeklyDigestOptions = {
    audience?: WeeklyDigestAudience;
    postIds?: string[];
    customSubject?: string;
    createdById?: string;
};

export type WeeklyDigestResult = {
    ok: boolean;
    reason?: string;
    campaign?: EmailCampaign;
    totalRecipients?: number;
    articleCount?: number;
    articles?: { id: string; title: string; slug: string }[];
};

/**
 * Builds and immediately broadcasts the weekly digest/weekly picks.
 * Can be triggered via cron job or by admin action in the dashboard.
 */
export async function buildAndSendWeeklyDigest(
    options: BuildWeeklyDigestOptions = {}
): Promise<WeeklyDigestResult> {
    try {
        const settings = await getEmailSettings();
        const audienceKind = options.audience || 'verified_users';

        // 1. Fetch articles for this week's digest
        let posts: { id: string; title: string; slug: string; publishedAt: Date | null }[] = [];

        if (options.postIds && options.postIds.length > 0) {
            posts = await prisma.blogPost.findMany({
                where: { id: { in: options.postIds }, status: 'PUBLISHED' },
                orderBy: { publishedAt: 'desc' },
                select: { id: true, title: true, slug: true, publishedAt: true },
            });
        }

        if (!posts.length) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            posts = await prisma.blogPost.findMany({
                where: {
                    status: 'PUBLISHED',
                    publishedAt: { gte: sevenDaysAgo },
                },
                orderBy: { publishedAt: 'desc' },
                take: 4,
                select: { id: true, title: true, slug: true, publishedAt: true },
            });

            // If fewer than 2 posts published this week, fallback to latest published posts
            if (posts.length < 2) {
                posts = await prisma.blogPost.findMany({
                    where: { status: 'PUBLISHED' },
                    orderBy: { publishedAt: 'desc' },
                    take: 4,
                    select: { id: true, title: true, slug: true, publishedAt: true },
                });
            }
        }

        if (!posts.length) {
            return {
                ok: false,
                reason: 'No published articles found to assemble a weekly digest.',
            };
        }

        // 2. Define campaign audience
        let campaignAudience: any;
        if (audienceKind === 'verified_users' || audienceKind === 'all') {
            campaignAudience = {
                kind: 'users',
                verifiedOnly: true,
                postIds: posts.map((p) => p.id),
                periodLabel: 'this week',
                label: 'All Verified Users',
            };
        } else {
            campaignAudience = {
                kind: 'subscribers',
                verifiedOnly: true,
                postIds: posts.map((p) => p.id),
                periodLabel: 'this week',
                label: 'Newsletter Subscribers',
            };
        }

        const subject =
            options.customSubject?.trim() ||
            `Weekly Poultry Market Picks: ${posts.length} Top Articles This Week`;

        // 3. Create campaign
        const campaign = await createCampaign({
            type: 'WEEKLY_DIGEST',
            subject,
            previewText: `Featuring: ${posts[0]?.title || 'Latest poultry insights'}`,
            content: `Here are the top stories and farming guides from PoultryMarket Kenya this week.`,
            audience: campaignAudience,
            senderAccount: settings.defaultSenderAccount,
            senderName: settings.defaultSenderName,
            createdById: options.createdById || null,
        });

        // 4. Queue and start dispatching
        const { total } = await queueCampaign(campaign.id);

        return {
            ok: true,
            campaign,
            totalRecipients: total,
            articleCount: posts.length,
            articles: posts,
        };
    } catch (error: any) {
        console.error('[email:weekly-digest] Failed to build and send weekly digest:', error);
        return {
            ok: false,
            reason: error?.message || 'Failed to generate weekly digest',
        };
    }
}
