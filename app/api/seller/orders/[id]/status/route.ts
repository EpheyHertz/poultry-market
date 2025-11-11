import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';
import { logOrderStatusUpdated } from '@/lib/order-timeline';
import { createNotification, notificationTemplates } from '@/lib/notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params:Promise<{ id: string }>}
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'SELLER' && user.role !== 'COMPANY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } =await params;
    const body = await request.json();
    const { status, statusMessage } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses: string[] = [
      'PACKED',
      'READY_FOR_DELIVERY',
      'IN_TRANSIT',
      'DELIVERED',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

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
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if order is approved
    if (order.status === OrderStatus.PENDING || order.status === OrderStatus.PAID) {
      return NextResponse.json(
        { error: 'Order must be approved before updating progress' },
        { status: 400 }
      );
    }

    const oldStatus = order.status;

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as OrderStatus,
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
    await logOrderStatusUpdated(
      orderId,
      user.id,
      user.name,
      oldStatus,
      status as OrderStatus
    );

    // Notify customer of status update
    const statusMessages: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.PACKED]: 'Your order has been packed and ready',
      [OrderStatus.READY_FOR_DELIVERY]: 'Your order is ready for delivery',
      [OrderStatus.IN_TRANSIT]: 'Your order is on the way',
      [OrderStatus.DELIVERED]: 'Your order has been delivered',
      [OrderStatus.READY_FOR_PICKUP]: 'Your order is ready for pickup',
      [OrderStatus.REACHED_COLLECTION_POINT]: 'Your order has reached the collection point',
    };

    const template = {
      title: 'Order Status Update',
      message: statusMessages[status as OrderStatus] || `Order status updated to ${status}`,
    };

    await createNotification({
      receiverId: order.customerId,
      senderId: user.id,
      orderId: orderId,
      type: 'EMAIL',
      title: template.title,
      message: statusMessage || template.message,
    });

    await createNotification({
      receiverId: order.customerId,
      senderId: user.id,
      orderId: orderId,
      type: 'SMS',
      title: template.title,
      message: statusMessage || template.message,
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
