import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCampaignStats, retryCampaign, cancelCampaign } from '@/lib/email/campaigns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getIdFromPath(request: NextRequest): string {
    // /api/admin/blog/email/campaigns/[id]
    const parts = request.nextUrl.pathname.split('/');
    return parts[parts.length - 1] || '';
}

/**
 * GET /api/admin/blog/email/campaigns/[id]
 * Full campaign detail: the record, live delivery stats, and a sample of the
 * most recent deliveries (including failures + error messages) for debugging.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const id = getIdFromPath(request);
        const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const [stats, recentDeliveries, failedSample] = await Promise.all([
            getCampaignStats(id),
            prisma.emailDelivery.findMany({
                where: { campaignId: id },
                orderBy: { updatedAt: 'desc' },
                take: 25,
                select: {
                    id: true,
                    email: true,
                    recipientName: true,
                    status: true,
                    attempts: true,
                    error: true,
                    sentAt: true,
                    updatedAt: true,
                },
            }),
            prisma.emailDelivery.findMany({
                where: { campaignId: id, status: 'FAILED' },
                orderBy: { updatedAt: 'desc' },
                take: 10,
                select: { email: true, error: true, attempts: true },
            }),
        ]);

        return NextResponse.json({
            campaign: {
                ...campaign,
                createdAt: campaign.createdAt.toISOString(),
                updatedAt: campaign.updatedAt.toISOString(),
                queuedAt: campaign.queuedAt ? campaign.queuedAt.toISOString() : null,
                startedAt: campaign.startedAt ? campaign.startedAt.toISOString() : null,
                completedAt: campaign.completedAt ? campaign.completedAt.toISOString() : null,
            },
            stats,
            recentDeliveries: recentDeliveries.map((d) => ({
                ...d,
                sentAt: d.sentAt ? d.sentAt.toISOString() : null,
                updatedAt: d.updatedAt.toISOString(),
            })),
            failedSample,
        });
    } catch (error) {
        console.error('Admin campaign detail error:', error);
        return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 });
    }
}

/**
 * POST /api/admin/blog/email/campaigns/[id]
 * Body: { action: 'retry' | 'cancel' }
 * - retry: resets FAILED/SKIPPED deliveries to PENDING and re-runs a slice
 *   inline (the rest is finished by the drain cron).
 * - cancel: marks the campaign CANCELLED and skips outstanding deliveries.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const id = getIdFromPath(request);
        const campaign = await prisma.emailCampaign.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const body = await request.json().catch(() => ({}));
        const action = String(body.action || '');

        if (action === 'retry' || action === 'restart') {
            const result = await retryCampaign(id, { timeBudgetMs: 20_000 });
            return NextResponse.json({
                success: true,
                action,
                result,
                message:
                    result.remaining > 0
                        ? `Campaign ${action === 'restart' ? 'restarted' : 'retrying'} — ${result.sent} sent immediately, ${result.remaining} still queued in background.`
                        : `Campaign complete — ${result.sent} sent, ${result.failed} failed.`,
            });
        }

        if (action === 'cancel') {
            const updated = await cancelCampaign(id);
            return NextResponse.json({
                success: true,
                action,
                status: updated.status,
                message: 'Campaign cancelled. Remaining recipients were skipped.',
            });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('Admin campaign action error:', error);
        return NextResponse.json({ error: 'Failed to run campaign action' }, { status: 500 });
    }
}
