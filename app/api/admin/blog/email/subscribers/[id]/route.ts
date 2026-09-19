import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resendVerification } from '@/lib/email/subscribers';

export const dynamic = 'force-dynamic';

function getIdFromPath(request: NextRequest): string {
    const parts = request.nextUrl.pathname.split('/');
    return parts[parts.length - 1] || '';
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const id = getIdFromPath(request);
        const subscriber = await prisma.blogSubscriber.findUnique({ where: { id } });
        if (!subscriber) {
            return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        }

        const body = await request.json().catch(() => ({}));
        const action = String(body.action || '').toLowerCase();

        if (action === 'unsubscribe') {
            const updated = await prisma.blogSubscriber.update({
                where: { id },
                data: {
                    status: 'UNSUBSCRIBED',
                    isActive: false,
                    unsubscribedAt: new Date(),
                },
            });

            await prisma.subscriberEvent.create({
                data: {
                    subscriberId: id,
                    type: 'UNSUBSCRIBED',
                    actorType: 'admin',
                    actorId: user.id,
                },
            });

            return NextResponse.json({
                subscriber: updated,
                message: 'Subscriber unsubscribed successfully',
            });
        }

        if (action === 'resubscribe' || action === 'activate' || action === 'verify') {
            const updated = await prisma.blogSubscriber.update({
                where: { id },
                data: {
                    status: 'ACTIVE',
                    isActive: true,
                    verifiedAt: subscriber.verifiedAt || new Date(),
                    resubscribedAt: new Date(),
                },
            });

            await prisma.subscriberEvent.create({
                data: {
                    subscriberId: id,
                    type: action === 'resubscribe' ? 'RESUBSCRIBED' : 'VERIFIED',
                    actorType: 'admin',
                    actorId: user.id,
                },
            });

            return NextResponse.json({
                subscriber: updated,
                message: 'Subscriber activated successfully',
            });
        }

        if (action === 'resend_verification') {
            const result = await resendVerification(subscriber.email);
            return NextResponse.json({
                success: result.ok,
                message: result.message,
            });
        }

        return NextResponse.json({ error: `Unsupported action '${action}'` }, { status: 400 });
    } catch (error) {
        console.error('Subscriber action error:', error);
        return NextResponse.json({ error: 'Failed to perform action on subscriber' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const id = getIdFromPath(request);
        const subscriber = await prisma.blogSubscriber.findUnique({ where: { id } });
        if (!subscriber) {
            return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        }

        await prisma.blogSubscriber.delete({ where: { id } });

        return NextResponse.json({
            success: true,
            message: 'Subscriber deleted permanently',
        });
    } catch (error) {
        console.error('Delete subscriber error:', error);
        return NextResponse.json({ error: 'Failed to delete subscriber' }, { status: 500 });
    }
}
