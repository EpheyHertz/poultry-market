import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma, type EmailDeliveryStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

function getCampaignIdFromPath(pathname: string): string {
    const parts = pathname.split('/').filter(Boolean);
    const deliveriesIndex = parts.lastIndexOf('deliveries');
    if (deliveriesIndex > 0) {
        return parts[deliveriesIndex - 1];
    }
    return '';
}

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const campaignId = getCampaignIdFromPath(request.nextUrl.pathname);
        if (!campaignId) {
            return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
        }

        const campaign = await prisma.emailCampaign.findUnique({
            where: { id: campaignId },
            select: { id: true, subject: true, status: true },
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search')?.trim();
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

        const where: Prisma.EmailDeliveryWhereInput = {
            campaignId,
        };

        if (status && status !== 'all') {
            where.status = status as EmailDeliveryStatus;
        }

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { recipientName: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [total, deliveries] = await Promise.all([
            prisma.emailDelivery.count({ where }),
            prisma.emailDelivery.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    email: true,
                    recipientName: true,
                    status: true,
                    attempts: true,
                    error: true,
                    sentAt: true,
                    lastAttemptAt: true,
                    createdAt: true,
                    updatedAt: true,
                    subscriberId: true,
                    providerMessageId: true,
                },
            }),
        ]);

        return NextResponse.json({
            campaign,
            deliveries: deliveries.map((d) => ({
                ...d,
                sentAt: d.sentAt ? d.sentAt.toISOString() : null,
                lastAttemptAt: d.lastAttemptAt ? d.lastAttemptAt.toISOString() : null,
                createdAt: d.createdAt.toISOString(),
                updatedAt: d.updatedAt.toISOString(),
                canRetry: d.status === 'FAILED' || d.status === 'SKIPPED',
            })),
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    } catch (error) {
        console.error('Campaign deliveries error:', error);
        return NextResponse.json({ error: 'Failed to load campaign deliveries' }, { status: 500 });
    }
}
