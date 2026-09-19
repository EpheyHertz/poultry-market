import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { retryDelivery } from '@/lib/email/campaigns';

export const dynamic = 'force-dynamic';

function getDeliveryIdFromPath(pathname: string): string {
    const parts = pathname.split('/').filter(Boolean);
    const retryIndex = parts.lastIndexOf('retry');
    if (retryIndex > 0) {
        return parts[retryIndex - 1];
    }
    return '';
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const deliveryId = getDeliveryIdFromPath(request.nextUrl.pathname);
        if (!deliveryId) {
            return NextResponse.json({ error: 'Delivery ID is required' }, { status: 400 });
        }

        const result = await retryDelivery(deliveryId);

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error || 'Failed to retry delivery',
                    delivery: result.delivery,
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Delivery successfully retried for ${result.delivery?.email || 'recipient'}.`,
            delivery: result.delivery,
        });
    } catch (error) {
        console.error('Retry delivery route error:', error);
        return NextResponse.json({ error: 'Failed to retry delivery for recipient' }, { status: 500 });
    }
}
