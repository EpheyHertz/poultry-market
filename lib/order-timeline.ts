import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export type TimelineEventType = 
  | 'ORDER_CREATED'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'ORDER_APPROVED'
  | 'ORDER_REJECTED'
  | 'STATUS_UPDATED'
  | 'DELIVERY_ASSIGNED'
  | 'DELIVERY_STARTED'
  | 'DELIVERY_COMPLETED'
  | 'ORDER_RECEIVED'
  | 'ORDER_COMPLETED'
  | 'REVIEW_SUBMITTED';

export type TimelineActor = 'SYSTEM' | 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'DELIVERY_AGENT';

export interface CreateTimelineEventData {
  orderId: string;
  eventType: TimelineEventType;
  actor: TimelineActor;
  actorId?: string;
  actorName?: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Create a timeline event for an order
 */
export async function createOrderTimelineEvent(data: CreateTimelineEventData) {
  try {
    return await prisma.orderTimeline.create({
      data: {
        orderId: data.orderId,
        action: data.eventType,
        actorId: data.actorId,
        actorRole: data.actor,
        actorName: data.actorName,
        description: data.description,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to create order timeline event:', error);
    // Don't throw - timeline is not critical for order flow
    return null;
  }
}

/**
 * Get timeline events for an order
 */
export async function getOrderTimeline(orderId: string) {
  try {
    return await prisma.orderTimeline.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Failed to fetch order timeline:', error);
    return [];
  }
}

/**
 * Create timeline event for order creation
 */
export async function logOrderCreated(
  orderId: string,
  customerId: string,
  customerName: string | null,
  paymentType: string
) {
  return createOrderTimelineEvent({
    orderId,
    eventType: 'ORDER_CREATED',
    actor: 'CUSTOMER',
    actorId: customerId,
    actorName: customerName || 'Customer',
    description: `Order created with ${paymentType} payment`,
    metadata: { paymentType },
  });
}

/**
 * Create timeline event for payment submission
 */
export async function logPaymentSubmitted(
  orderId: string,
  customerId: string,
  customerName: string | null,
  method: string,
  amount: number
) {
  return createOrderTimelineEvent({
    orderId,
    eventType: 'PAYMENT_SUBMITTED',
    actor: 'CUSTOMER',
    actorId: customerId,
    actorName: customerName || 'Customer',
    description: `Payment submitted via ${method} (KES ${amount})`,
    metadata: { method, amount },
  });
}

/**
 * Create timeline event for payment confirmation
 */
export async function logPaymentConfirmed(
  orderId: string,
  actorId: string,
  actorName: string | null,
  isAutomatic: boolean = false
) {
  return createOrderTimelineEvent({
    orderId,
    eventType: 'PAYMENT_CONFIRMED',
    actor: isAutomatic ? 'SYSTEM' : 'ADMIN',
    actorId: isAutomatic ? undefined : actorId,
    actorName: isAutomatic ? 'System' : actorName || 'Admin',
    description: isAutomatic
      ? 'Payment automatically verified and confirmed'
      : 'Payment manually verified and confirmed',
    metadata: { automatic: isAutomatic },
  });
}

/**
 * Create timeline event for order approval
 */
export async function logOrderApproved(
  orderId: string,
  sellerId: string,
  sellerName: string | null
) {
  return createOrderTimelineEvent({
    orderId,
    eventType: 'ORDER_APPROVED',
    actor: 'SELLER',
    actorId: sellerId,
    actorName: sellerName || 'Seller',
    description: 'Order approved by seller and processing started',
  });
}

/**
 * Create timeline event for order status update
 */
export async function logOrderStatusUpdated(
  orderId: string,
  sellerId: string,
  sellerName: string | null,
  oldStatus: OrderStatus,
  newStatus: OrderStatus
) {
  return createOrderTimelineEvent({
    orderId,
    eventType: 'STATUS_UPDATED',
    actor: 'SELLER',
    actorId: sellerId,
    actorName: sellerName || 'Seller',
    description: `Order status updated from ${oldStatus} to ${newStatus}`,
    metadata: { oldStatus, newStatus },
  });
}

/**
 * Create timeline event for order received
 */
export async function logOrderReceived(
  orderId: string,
  customerId: string,
  customerName: string | null,
  hasProof: boolean = false
) {
  return createOrderTimelineEvent({
    orderId,
    eventType: 'ORDER_RECEIVED',
    actor: 'CUSTOMER',
    actorId: customerId,
    actorName: customerName || 'Customer',
    description: hasProof
      ? 'Order marked as received with delivery proof'
      : 'Order marked as received',
    metadata: { hasProof },
  });
}

/**
 * Create timeline event for order completion
 */
export async function logOrderCompleted(
  orderId: string,
  hasReview: boolean = false
) {
  return createOrderTimelineEvent({
    orderId,
    eventType: 'ORDER_COMPLETED',
    actor: 'SYSTEM',
    description: hasReview
      ? 'Order completed with customer review'
      : 'Order completed',
    metadata: { hasReview },
  });
}

/**
 * Create timeline event for review submission
 */
export async function logReviewSubmitted(
  orderId: string,
  customerId: string,
  customerName: string | null,
  rating: number
) {
  return createOrderTimelineEvent({
    orderId,
    eventType: 'REVIEW_SUBMITTED',
    actor: 'CUSTOMER',
    actorId: customerId,
    actorName: customerName || 'Customer',
    description: `Customer submitted a ${rating}-star review`,
    metadata: { rating },
  });
}
