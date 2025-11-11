import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';
import { logOrderReceived, logOrderCompleted } from '@/lib/order-timeline';
import { createNotification } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { 
      deliveryProofImages, 
      deliveryProofText,
      receivedDate 
    } = body;

    // Verify order belongs to customer
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: user.id,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is already marked as received
    if (order.status === OrderStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Order already marked as completed' },
        { status: 400 }
      );
    }

    // Check if order is in correct status to be received
    const validStatuses: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.IN_TRANSIT, OrderStatus.READY_FOR_DELIVERY];
    if (!validStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: 'Order is not yet ready to be marked as received' },
        { status: 400 }
      );
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        deliveryProofImages: deliveryProofImages || [],
        deliveryProofMessage: deliveryProofText || null,
        completedAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: true,
              },
            },
          },
        },
      },
    });

    // Log timeline events
    await logOrderReceived(
      orderId,
      user.id,
      user.name,
      !!(deliveryProofImages || deliveryProofText)
    );

    await logOrderCompleted(orderId, false);

    // Notify sellers
    const sellerIds = new Set(
      updatedOrder.items.map((item) => item.product.sellerId)
    );

    for (const sellerId of Array.from(sellerIds)) {
      await createNotification({
        receiverId: sellerId,
        senderId: user.id,
        orderId: orderId,
        type: 'EMAIL',
        title: 'Order Received',
        message: `Customer has confirmed receipt of order #${orderId.slice(-8)}`,
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Mark order received error:', error);
    return NextResponse.json(
      { error: 'Failed to mark order as received' },
      { status: 500 }
    );
  }
}
