import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getIntaSendErrorMessage } from '@/lib/intasend';
import { handleSubscriptionPaymentWebhook } from '@/modules/subscriptions/webhook';

// IntaSend webhook challenge for secure verification
const INTASEND_WEBHOOK_CHALLENGE = process.env.INTASEND_WEBHOOK_CHALLENGE || '';
const INTASEND_WEBHOOK_SECRET = process.env.INTASEND_WEBHOOK_SECRET || '';

/**
 * IntaSend Collection Webhook Payload
 * Handles both M-Pesa STK Push and Card payment events
 */
interface IntaSendWebhookPayload {
  invoice_id: string;
  state: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'RETRY';
  provider: string; // 'M-PESA', 'CARD-PAYMENT'
  charges: string;
  net_amount: string;
  currency: string;
  value: string;
  account: string; // Phone number or email
  api_ref: string; // Our reference (e.g., 'pos-sale-xxxxx' or 'order-xxxxx')
  host: string;
  mpesa_reference?: string;
  card_info?: {
    bin_country: string;
    nonce: string;
  };
  failed_reason: string | null;
  failed_code: string | null;
  failed_code_link: string;
  created_at: string;
  updated_at: string;
  challenge: string;
}

/**
 * Validate the HMAC signature from IntaSend (if configured)
 */
function validateSignature(request: NextRequest, body: string): boolean {
  if (!INTASEND_WEBHOOK_SECRET) return true; // Skip if not configured
  
  const signature = request.headers.get('x-intasend-signature') || 
                    request.headers.get('X-IntaSend-Signature');
  
  if (!signature) {
    console.warn('[IntaSend Webhook] No signature header found');
    return false;
  }
  
  // Use Web Crypto API for HMAC verification
  // In production, verify the HMAC-SHA256 signature
  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', INTASEND_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[IntaSend Webhook] Signature validation error:', error);
    return false;
  }
}

/**
 * POST /api/webhooks/intasend
 * 
 * Central webhook handler for all IntaSend payment events:
 * - POS Sales (api_ref starts with 'pos-')
 * - Online Orders (api_ref starts with 'order-')
 * - General payments
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body: IntaSendWebhookPayload = JSON.parse(rawBody);
    
    console.log('[IntaSend Webhook] Received:', JSON.stringify({
      invoice_id: body.invoice_id,
      state: body.state,
      provider: body.provider,
      api_ref: body.api_ref,
      value: body.value,
    }));

    // 1. Validate challenge token
    if (INTASEND_WEBHOOK_CHALLENGE && body.challenge !== INTASEND_WEBHOOK_CHALLENGE) {
      console.error('[IntaSend Webhook] Invalid challenge:', body.challenge);
      return NextResponse.json(
        { received: true, error: 'Invalid challenge' },
        { status: 401 }
      );
    }

    // 2. Validate HMAC signature (if secret is configured)
    if (INTASEND_WEBHOOK_SECRET && !validateSignature(request, rawBody)) {
      console.error('[IntaSend Webhook] Invalid signature');
      return NextResponse.json(
        { received: true, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const { invoice_id, state, api_ref, mpesa_reference, failed_reason, failed_code } = body;

    // 3. Route based on api_ref prefix
    if (api_ref.startsWith('subscription-')) {
      await handleSubscriptionPaymentWebhook(body);
    } else if (api_ref.startsWith('pos-')) {
      await handlePOSPayment(body);
    } else if (api_ref.startsWith('order-')) {
      await handleOrderPayment(body);
    } else {
      // Generic payment invoice update
      await handleGenericPayment(body);
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error('[IntaSend Webhook] Error:', error);
    // Always return 200 to prevent IntaSend from retrying
    return NextResponse.json(
      { received: true, error: 'Internal processing error' },
      { status: 200 }
    );
  }
}

/**
 * Handle POS sale payment webhook
 */
async function handlePOSPayment(payload: IntaSendWebhookPayload) {
  const { invoice_id, state, mpesa_reference, failed_reason, failed_code, api_ref, net_amount } = payload;
  
  // Extract sale ID from api_ref: 'pos-{saleId}'
  const saleId = api_ref.replace('pos-', '');
  
  console.log(`[IntaSend Webhook] POS Payment - Sale: ${saleId}, State: ${state}`);

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });

  if (!sale) {
    console.error(`[IntaSend Webhook] Sale not found: ${saleId}`);
    return;
  }

  if (state === 'COMPLETE') {
    // Payment successful — update sale with M-Pesa reference
    await prisma.sale.update({
      where: { id: saleId },
      data: {
        mpesaReference: mpesa_reference || null,
        status: 'COMPLETED',
      },
    });

    console.log(`[IntaSend Webhook] POS Sale ${saleId} payment confirmed: ${mpesa_reference}`);
  } else if (state === 'FAILED') {
    const errorInfo = getIntaSendErrorMessage(failed_code, failed_reason);
    console.error(`[IntaSend Webhook] POS Payment failed for sale ${saleId}:`, errorInfo);

    // Restore stock for failed POS payments
    await prisma.$transaction(async (tx) => {
      // Void the sale
      await tx.sale.update({
        where: { id: saleId },
        data: { status: 'VOIDED' },
      });

      // Restore stock for each item
      for (const item of sale.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const newStock = product.stock + item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock },
          });

          // Log inventory restoration
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              userId: sale.sellerId,
              action: 'RETURN',
              quantity: item.quantity,
              previousStock: product.stock,
              newStock,
              saleId: sale.id,
              reason: `POS payment failed: ${errorInfo.userMessage}`,
            },
          });
        }
      }
    });

    console.log(`[IntaSend Webhook] POS Sale ${saleId} voided, stock restored`);
  }
  // PENDING / PROCESSING states are ignored (no action needed)
}

/**
 * Handle online order payment webhook
 */
async function handleOrderPayment(payload: IntaSendWebhookPayload) {
  const { invoice_id, state, mpesa_reference, failed_reason, failed_code, api_ref, net_amount } = payload;
  
  // Extract order ID from api_ref: 'order-{orderId}'
  const orderId = api_ref.replace('order-', '');
  
  console.log(`[IntaSend Webhook] Order Payment - Order: ${orderId}, State: ${state}`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });

  if (!order) {
    console.error(`[IntaSend Webhook] Order not found: ${orderId}`);
    return;
  }

  if (state === 'COMPLETE') {
    await prisma.$transaction(async (tx) => {
      // Update order payment status
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'CONFIRMED',
          status: 'PAID',
          paymentReference: mpesa_reference || invoice_id,
        },
      });

      // Update payment record if exists
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'CONFIRMED',
            transactionCode: mpesa_reference || null,
            callbackReceived: true,
            callbackData: JSON.stringify(payload),
          },
        });
      }

      // Update payment invoice
      await tx.paymentInvoice.updateMany({
        where: { invoiceId: invoice_id },
        data: {
          status: 'COMPLETE',
          isUsed: true,
        },
      });

      // Create timeline entry
      await tx.orderTimeline.create({
        data: {
          orderId,
          action: 'Payment Confirmed',
          description: `Payment confirmed via ${payload.provider}. Reference: ${mpesa_reference || invoice_id}`,
          oldStatus: order.status,
          newStatus: 'PAID',
          actorRole: 'SYSTEM',
          actorName: 'IntaSend Webhook',
        },
      });

      // Create notification for seller
      if (order.sellerId) {
        await tx.notification.create({
          data: {
            receiverId: order.sellerId,
            orderId,
            type: 'PUSH',
            title: 'Payment Received',
            message: `Payment of KES ${net_amount} received for order #${orderId.slice(-8)}`,
          },
        });
      }
    });

    console.log(`[IntaSend Webhook] Order ${orderId} payment confirmed: ${mpesa_reference}`);
  } else if (state === 'FAILED') {
    const errorInfo = getIntaSendErrorMessage(failed_code, failed_reason);
    
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'FAILED',
        },
      });

      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'FAILED',
            failureReason: errorInfo.userMessage,
            callbackReceived: true,
            callbackData: JSON.stringify(payload),
          },
        });
      }

      // Restore stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.orderTimeline.create({
        data: {
          orderId,
          action: 'Payment Failed',
          description: errorInfo.userMessage,
          actorRole: 'SYSTEM',
          actorName: 'IntaSend Webhook',
        },
      });
    });

    console.log(`[IntaSend Webhook] Order ${orderId} payment failed, stock restored`);
  }
}

/**
 * Handle generic payment invoice updates
 */
async function handleGenericPayment(payload: IntaSendWebhookPayload) {
  const { invoice_id, state } = payload;
  
  // Update payment invoice record if it exists
  const statusMap: Record<string, 'PENDING' | 'COMPLETE' | 'FAILED'> = {
    'PENDING': 'PENDING',
    'PROCESSING': 'PENDING',
    'COMPLETE': 'COMPLETE',
    'FAILED': 'FAILED',
  };

  const mappedStatus = statusMap[state];
  if (!mappedStatus) return;

  await prisma.paymentInvoice.updateMany({
    where: { invoiceId: invoice_id },
    data: {
      status: mappedStatus,
      isUsed: mappedStatus === 'COMPLETE',
    },
  });

  console.log(`[IntaSend Webhook] Generic payment ${invoice_id} updated to ${mappedStatus}`);
}
