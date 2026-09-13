import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAndQueueCampaign } from '@/lib/email/campaigns';
import type { CampaignAudience, CreateCampaignInput } from '@/lib/email/campaigns';
import { normalizeTopics } from '@/lib/email/topics';
import type { EmailCampaignType, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_TYPES: EmailCampaignType[] = [
    'BLOG_NOTIFICATION',
    'WEEKLY_DIGEST',
    'NEWSLETTER',
    'ANNOUNCEMENT',
    'USER_BROADCAST',
];

/**
 * GET /api/admin/blog/email/campaigns?status=&type=&page=1&pageSize=20
 * Paginated campaign history. The authoritative sent/failed counters live on
 * the campaign row (maintained by the send loop), so no per-row stat calls.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const params = request.nextUrl.searchParams;
        const page = Math.max(1, Number(params.get('page')) || 1);
        const pageSize = Math.min(50, Math.max(5, Number(params.get('pageSize')) || 20));

        const where: Prisma.EmailCampaignWhereInput = {};
        const statusParam = params.get('status');
        const typeParam = params.get('type');
        if (statusParam) where.status = statusParam as Prisma.EmailCampaignWhereInput['status'];
        if (typeParam && VALID_TYPES.includes(typeParam as EmailCampaignType)) {
            where.type = typeParam as EmailCampaignType;
        }

        const [total, campaigns] = await Promise.all([
            prisma.emailCampaign.count({ where }),
            prisma.emailCampaign.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    type: true,
                    status: true,
                    subject: true,
                    previewText: true,
                    topics: true,
                    blogPostId: true,
                    totalRecipients: true,
                    sentCount: true,
                    failedCount: true,
                    senderName: true,
                    createdAt: true,
                    queuedAt: true,
                    completedAt: true,
                },
            }),
        ]);

        return NextResponse.json({
            campaigns: campaigns.map((c) => ({
                ...c,
                createdAt: c.createdAt.toISOString(),
                queuedAt: c.queuedAt ? c.queuedAt.toISOString() : null,
                completedAt: c.completedAt ? c.completedAt.toISOString() : null,
            })),
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.max(1, Math.ceil(total / pageSize)),
            },
        });
    } catch (error) {
        console.error('Admin campaigns list error:', error);
        return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 });
    }
}

/**
 * POST /api/admin/blog/email/campaigns
 * Creates AND queues a campaign in one step. Sending happens asynchronously via
 * the drain cron, so this returns immediately with the id + resolved recipient
 * total. Audience defaults to verified subscribers, optionally topic-filtered,
 * or a custom email list for one-off sends.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));

        const subject = String(body.subject || '').trim();
        const content = String(body.content || '').trim();
        if (!subject || !content) {
            return NextResponse.json(
                { error: 'Subject and content are required.' },
                { status: 400 }
            );
        }

        const type: EmailCampaignType = VALID_TYPES.includes(body.type)
            ? body.type
            : 'NEWSLETTER';

        let audience: CampaignAudience;
        const rawAudience = body.audience || {};

        if (rawAudience.kind === 'custom' && Array.isArray(rawAudience.emails)) {
            const emails = rawAudience.emails.map((e: unknown) => String(e).trim()).filter(Boolean);
            if (emails.length === 0) {
                return NextResponse.json(
                    { error: 'Custom audience needs at least one email address.' },
                    { status: 400 }
                );
            }
            audience = { kind: 'custom', emails, label: 'Custom list' };
        } else {
            const topics = Array.isArray(rawAudience.topics) ? normalizeTopics(rawAudience.topics) : [];
            audience = {
                kind: 'subscribers',
                topics: topics.length ? topics : undefined,
                verifiedOnly: true,
            };
        }

        const input: CreateCampaignInput = {
            type,
            subject,
            content,
            previewText: body.previewText ? String(body.previewText) : null,
            ctaLabel: body.ctaLabel ? String(body.ctaLabel) : null,
            ctaUrl: body.ctaUrl ? String(body.ctaUrl) : null,
            imageUrl: body.imageUrl ? String(body.imageUrl) : null,
            audience,
            topics: audience.kind === 'subscribers' ? audience.topics : undefined,
            senderName: body.senderName ? String(body.senderName) : null,
            createdById: user.id,
        };

        const { campaign, total } = await createAndQueueCampaign(input);

        return NextResponse.json(
            {
                campaign: {
                    id: campaign.id,
                    type: campaign.type,
                    status: campaign.status,
                    subject: campaign.subject,
                    totalRecipients: campaign.totalRecipients,
                },
                total,
                message:
                    total > 0
                        ? `Campaign queued for ${total} recipient${total === 1 ? '' : 's'}. Delivery runs in the background.`
                        : 'Campaign created, but no matching recipients were found.',
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Admin campaign create error:', error);
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }
}
