import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { logOrderApproved } from '@/lib/order-timeline';
import { createNotification, notificationTemplates } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params:Promise<{ id: string }>}
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'SELLER' && user.role !== 'COMPANY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } =await params;

    // Verify order exists and seller owns the products
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        items: {
          some: {
            product: {
              sellerId: user.id,
            },
          },
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if payment is confirmed
    if (order.paymentStatus !== PaymentStatus.CONFIRMED) {
      return NextResponse.json(
        { error: 'Payment must be confirmed before approving order' },
        { status: 400 }
      );
    }

    // Check if already approved
    if (order.status === OrderStatus.APPROVED || order.status === OrderStatus.PACKED) {
      return NextResponse.json(
        { error: 'Order already approved' },
        { status: 400 }
      );
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: user.id,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Log timeline event
    await logOrderApproved(orderId, user.id, user.name);

    // Notify customer
    const template = notificationTemplates.orderApproved(orderId.slice(-8));
    
    await createNotification({
      receiverId: order.customerId,
      senderId: user.id,
      orderId: orderId,
      type: 'EMAIL',
      title: template.title,
      message: template.message,
    });

    await createNotification({
      receiverId: order.customerId,
      senderId: user.id,
      orderId: orderId,
      type: 'SMS',
      title: template.title,
      message: template.message,
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Order approval error:', error);
    return NextResponse.json(
      { error: 'Failed to approve order' },
      { status: 500 }
    );
  }
}
