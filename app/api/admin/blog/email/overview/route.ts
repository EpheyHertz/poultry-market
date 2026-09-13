import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEmailSettings } from '@/lib/email/settings';
import { getEmailConfigStatus } from '@/lib/email/config';

export const dynamic = 'force-dynamic';

/**
 * Admin overview for the blog email / subscriber system.
 *
 * Returns headline counters (subscribers by status, campaign + delivery totals),
 * a 30-day trend, and the current runtime configuration/health so the dashboard
 * can surface "email is not fully configured" warnings without leaking secrets.
 */
export async function GET(_request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            totalSubscribers,
            activeSubscribers,
            pendingSubscribers,
            unsubscribedSubscribers,
            bouncedSubscribers,
            newSubscribers30d,
            totalCampaigns,
            sendingCampaigns,
            recentCampaigns,
            deliveryTotals,
            deliverySent,
            deliveryFailed,
            settings,
        ] = await Promise.all([
            prisma.blogSubscriber.count(),
            prisma.blogSubscriber.count({ where: { status: 'ACTIVE' } }),
            prisma.blogSubscriber.count({ where: { status: 'PENDING' } }),
            prisma.blogSubscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
            prisma.blogSubscriber.count({ where: { status: 'BOUNCED' } }),
            prisma.blogSubscriber.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            prisma.emailCampaign.count(),
            prisma.emailCampaign.count({
                where: { status: { in: ['QUEUED', 'SENDING', 'PARTIALLY_FAILED'] } },
            }),
            prisma.emailCampaign.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    type: true,
                    status: true,
                    subject: true,
                    totalRecipients: true,
                    sentCount: true,
                    failedCount: true,
                    createdAt: true,
                    completedAt: true,
                },
            }),
            prisma.emailDelivery.count(),
            prisma.emailDelivery.count({ where: { status: 'SENT' } }),
            prisma.emailDelivery.count({ where: { status: 'FAILED' } }),
            getEmailSettings({ fresh: true }),
        ]);

        const config = getEmailConfigStatus();

        return NextResponse.json({
            subscribers: {
                total: totalSubscribers,
                active: activeSubscribers,
                pending: pendingSubscribers,
                unsubscribed: unsubscribedSubscribers,
                bounced: bouncedSubscribers,
                newLast30Days: newSubscribers30d,
            },
            campaigns: {
                total: totalCampaigns,
                inProgress: sendingCampaigns,
                recent: recentCampaigns.map((c) => ({
                    ...c,
                    createdAt: c.createdAt.toISOString(),
                    completedAt: c.completedAt ? c.completedAt.toISOString() : null,
                })),
            },
            deliveries: {
                total: deliveryTotals,
                sent: deliverySent,
                failed: deliveryFailed,
            },
            settings,
            config,
        });
    } catch (error) {
        console.error('Admin email overview error:', error);
        return NextResponse.json({ error: 'Failed to load email overview' }, { status: 500 });
    }
}
