import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { logPaymentConfirmed } from '@/lib/order-timeline';
import { createNotification, notificationTemplates } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { notes } = body;

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        customer: true,
        items: {
          include: {
            product: {
              include: { seller: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus === PaymentStatus.CONFIRMED) {
      return NextResponse.json(
        { error: 'Payment already confirmed' },
        { status: 400 }
      );
    }

    // ✅ Run updates in a transaction with proper timeout
    const updatedOrder = await prisma.$transaction(
      async (tx) => {
        // Update order
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.CONFIRMED,
            status: OrderStatus.PAID,
          },
          include: {
            customer: true,
            items: {
              include: {
                product: {
                  include: { seller: true },
                },
              },
            },
            payment: true,
          },
        });

        // Update payment
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: PaymentStatus.CONFIRMED },
          });
        }

        // Log admin approval
        await tx.paymentApprovalLog.create({
          data: {
            orderId,
            approverId: user.id,
            action: 'APPROVED',
            notes: notes || 'Payment manually verified and confirmed',
          },
        });

        return updated;
      },
      { timeout: 15000 } // ✅ extend timeout to 15s
    );

    // ✅ Log event outside transaction
    await logPaymentConfirmed(orderId, user.id, user.name, false);

    // ✅ Notify sellers
    const sellerIds = new Set(updatedOrder.items.map((i) => i.product.sellerId));

    for (const sellerId of sellerIds) {
      const seller = updatedOrder.items.find(
        (i) => i.product.sellerId === sellerId
      )?.product.seller;

      if (seller) {
        const template = notificationTemplates.paymentConfirmed(
          orderId.slice(-8),
          updatedOrder.total
        );

        await Promise.all([
          createNotification({
            receiverId: sellerId,
            senderId: user.id,
            orderId: updatedOrder.id,
            type: 'EMAIL',
            title: template.title,
            message: template.message,
          }),
          createNotification({
            receiverId: sellerId,
            senderId: user.id,
            orderId: updatedOrder.id,
            type: 'SMS',
            title: template.title,
            message: template.message,
          }),
        ]);
      }
    }

    // ✅ Notify customer
    const customerTemplate = notificationTemplates.paymentConfirmed(
      orderId.slice(-8),
      updatedOrder.total
    );

    await createNotification({
      receiverId: updatedOrder.customerId,
      senderId: user.id,
      orderId: updatedOrder.id,
      type: 'EMAIL',
      title: customerTemplate.title,
      message: customerTemplate.message,
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
