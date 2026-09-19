import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildAndSendWeeklyDigest } from '@/lib/email/weekly-digest';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let articles = await prisma.blogPost.findMany({
            where: {
                status: 'PUBLISHED',
                publishedAt: { gte: sevenDaysAgo },
            },
            orderBy: { publishedAt: 'desc' },
            take: 4,
            select: {
                id: true,
                title: true,
                slug: true,
                category: true,
                publishedAt: true,
                featuredImage: true,
            },
        });

        if (articles.length < 2) {
            articles = await prisma.blogPost.findMany({
                where: { status: 'PUBLISHED' },
                orderBy: { publishedAt: 'desc' },
                take: 4,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    category: true,
                    publishedAt: true,
                    featuredImage: true,
                },
            });
        }

        const [verifiedUserCount, activeSubscriberCount] = await Promise.all([
            prisma.user.count({ where: { isVerified: true } }),
            prisma.blogSubscriber.count({ where: { status: 'ACTIVE' } }),
        ]);

        return NextResponse.json({
            articles: articles.map((a) => ({
                ...a,
                publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
            })),
            estimatedAudience: {
                verifiedUsers: verifiedUserCount,
                activeSubscribers: activeSubscriberCount,
            },
        });
    } catch (error) {
        console.error('Weekly digest preview error:', error);
        return NextResponse.json({ error: 'Failed to preview weekly digest' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const audience = body.audience === 'subscribers' ? 'subscribers' : 'verified_users';
        const customSubject = body.customSubject?.trim();
        const postIds = Array.isArray(body.postIds) ? body.postIds : undefined;

        const result = await buildAndSendWeeklyDigest({
            audience,
            customSubject,
            postIds,
            createdById: user.id,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.reason || 'Failed to dispatch weekly digest' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            campaignId: result.campaign?.id,
            totalRecipients: result.totalRecipients,
            articleCount: result.articleCount,
            message: `Weekly digest successfully queued for ${result.totalRecipients} recipient(s). Sends are processing immediately in the background!`,
        });
    } catch (error) {
        console.error('Weekly digest trigger error:', error);
        return NextResponse.json({ error: 'Failed to broadcast weekly digest' }, { status: 500 });
    }
}
