import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';
import { logReviewSubmitted } from '@/lib/order-timeline';
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
    const { rating, review, productId } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Valid rating (1-5) is required' },
        { status: 400 }
      );
    }

    // Verify order belongs to customer and is completed
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

    if (order.status !== OrderStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Can only review completed orders' },
        { status: 400 }
      );
    }

    // If productId is provided, verify it's in the order
    if (productId) {
      const orderItem = order.items.find(item => item.productId === productId);
      if (!orderItem) {
        return NextResponse.json(
          { error: 'Product not found in this order' },
          { status: 404 }
        );
      }

      // Check if review already exists
      const existingReview = await prisma.review.findFirst({
        where: {
          productId: productId,
          userId: user.id,
        },
      });

      if (existingReview) {
        return NextResponse.json(
          { error: 'You have already reviewed this product' },
          { status: 400 }
        );
      }

      // Create review
      const createdReview = await prisma.review.create({
        data: {
          productId: productId,
          userId: user.id,
          rating: rating,
          comment: review || '',
        },
      });

      // Log timeline event
      await logReviewSubmitted(orderId, user.id, user.name, rating);

      // Notify seller
      await createNotification({
        receiverId: orderItem.product.sellerId,
        senderId: user.id,
        orderId: orderId,
        type: 'EMAIL',
        title: 'New Review',
        message: `You received a ${rating}-star review for ${orderItem.product.name}`,
      });

      return NextResponse.json({
        success: true,
        review: createdReview,
      });
    } else {
      // Review entire order experience - just log it in timeline
      await logReviewSubmitted(orderId, user.id, user.name, rating);

      // Notify all sellers
      const sellerIds = new Set(
        order.items.map((item) => item.product.sellerId)
      );

      for (const sellerId of Array.from(sellerIds)) {
        await createNotification({
          receiverId: sellerId,
          senderId: user.id,
          orderId: orderId,
          type: 'EMAIL',
          title: 'New Order Review',
          message: `You received a ${rating}-star review for order #${orderId.slice(-8)}`,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Review submitted successfully',
      });
    }
  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
