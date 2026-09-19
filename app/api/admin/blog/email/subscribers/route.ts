import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma, type SubscriberStatus, type SubscriberFrequency, type BlogPostCategory } from '@prisma/client';
import { normalizeEmail, isValidEmail, normalizeName } from '@/lib/email/address';
import { normalizeTopics, isSubscriberFrequency } from '@/lib/email/topics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search')?.trim();
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

        const where: Prisma.BlogSubscriberWhereInput = {};

        if (status && status !== 'all') {
            where.status = status as SubscriberStatus;
        }

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [total, subscribers] = await Promise.all([
            prisma.blogSubscriber.count({ where }),
            prisma.blogSubscriber.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    status: true,
                    topics: true,
                    allTopics: true,
                    frequency: true,
                    verifiedAt: true,
                    createdAt: true,
                    updatedAt: true,
                    emailsSent: true,
                    bounceCount: true,
                    lastEmailSentAt: true,
                    source: true,
                },
            }),
        ]);

        return NextResponse.json({
            subscribers: subscribers.map((s) => ({
                ...s,
                verifiedAt: s.verifiedAt ? s.verifiedAt.toISOString() : null,
                createdAt: s.createdAt.toISOString(),
                updatedAt: s.updatedAt.toISOString(),
                lastEmailSentAt: s.lastEmailSentAt ? s.lastEmailSentAt.toISOString() : null,
            })),
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    } catch (error) {
        console.error('Failed to list subscribers:', error);
        return NextResponse.json({ error: 'Failed to list subscribers' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const rawEmail = String(body.email || '');
        const email = normalizeEmail(rawEmail);

        if (!isValidEmail(email)) {
            return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
        }

        const name = normalizeName(body.name);
        const autoActivate = Boolean(body.autoActivate ?? true);
        const allTopics = body.allTopics !== false;
        const topics = allTopics ? [] : (normalizeTopics(body.topics) as BlogPostCategory[]);
        const frequency = (isSubscriberFrequency(body.frequency) ? body.frequency : 'EVERY_POST') as SubscriberFrequency;

        const existing = await prisma.blogSubscriber.findUnique({ where: { email } });
        if (existing) {
            if (existing.status === 'ACTIVE') {
                return NextResponse.json({ error: 'A subscriber with this email is already active.' }, { status: 400 });
            }

            const updated = await prisma.blogSubscriber.update({
                where: { id: existing.id },
                data: {
                    name: name ?? existing.name,
                    status: autoActivate ? 'ACTIVE' : existing.status,
                    verifiedAt: autoActivate ? (existing.verifiedAt || new Date()) : existing.verifiedAt,
                    isActive: autoActivate,
                    topics,
                    allTopics,
                    frequency,
                    resubscribedAt: autoActivate ? new Date() : existing.resubscribedAt,
                },
            });

            await prisma.subscriberEvent.create({
                data: {
                    subscriberId: updated.id,
                    type: autoActivate ? 'RESUBSCRIBED' : 'ADMIN_ACTION',
                    actorType: 'admin',
                    actorId: user.id,
                    metadata: { source: 'admin_modal', autoActivate },
                },
            });

            return NextResponse.json({
                subscriber: updated,
                message: autoActivate ? 'Subscriber reactivated.' : 'Subscriber updated.',
            });
        }

        const created = await prisma.blogSubscriber.create({
            data: {
                email,
                name,
                status: autoActivate ? 'ACTIVE' : 'PENDING',
                verifiedAt: autoActivate ? new Date() : null,
                isActive: autoActivate,
                topics,
                allTopics,
                frequency,
                source: 'admin',
                newPostAlerts: frequency === 'EVERY_POST',
                weeklyDigest: frequency === 'WEEKLY_DIGEST',
            },
        });

        await prisma.subscriberEvent.create({
            data: {
                subscriberId: created.id,
                type: 'SUBSCRIBED',
                actorType: 'admin',
                actorId: user.id,
                metadata: { source: 'admin_modal', autoActivate },
            },
        });

        return NextResponse.json({
            subscriber: created,
            message: autoActivate ? 'Subscriber added and marked active.' : 'Subscriber created.',
        });
    } catch (error) {
        console.error('Failed to create subscriber:', error);
        return NextResponse.json({ error: 'Failed to create subscriber' }, { status: 500 });
    }
}
