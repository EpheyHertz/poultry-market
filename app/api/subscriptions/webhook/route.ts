import { NextRequest, NextResponse } from 'next/server';
import { handleSubscriptionPaymentWebhook, type IntaSendSubscriptionWebhookPayload } from '@/modules/subscriptions/webhook';

const INTASEND_WEBHOOK_CHALLENGE = process.env.INTASEND_WEBHOOK_CHALLENGE || '';
const INTASEND_WEBHOOK_SECRET = process.env.INTASEND_WEBHOOK_SECRET || '';

function validateSignature(request: NextRequest, body: string): boolean {
  if (!INTASEND_WEBHOOK_SECRET) return true;

  const signature =
    request.headers.get('x-intasend-signature') ||
    request.headers.get('X-IntaSend-Signature');

  if (!signature) {
    return false;
  }

  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', INTASEND_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody) as IntaSendSubscriptionWebhookPayload & { challenge?: string };

    if (INTASEND_WEBHOOK_CHALLENGE && body.challenge !== INTASEND_WEBHOOK_CHALLENGE) {
      return NextResponse.json({ received: true, error: 'Invalid challenge' }, { status: 401 });
    }

    if (INTASEND_WEBHOOK_SECRET && !validateSignature(request, rawBody)) {
      return NextResponse.json({ received: true, error: 'Invalid signature' }, { status: 401 });
    }

    const result = await handleSubscriptionPaymentWebhook(body);

    return NextResponse.json({
      received: true,
      processed: true,
      result,
    });
  } catch (error) {
    console.error('Subscription webhook error:', error);
    return NextResponse.json(
      {
        received: true,
        processed: false,
      },
      { status: 200 }
    );
  }
}
