import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getOrderTimeline } from '@/lib/order-timeline';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }>}
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } =await params;

    // Get order to verify access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if user has access to this order
    const hasAccess =
      user.role === 'ADMIN' ||
      order.customerId === user.id ||
      order.items.some((item) => item.product.sellerId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get timeline
    const timeline = await getOrderTimeline(orderId);

    return NextResponse.json({
      timeline,
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
      },
    });
  } catch (error) {
    console.error('Timeline fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}
