import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { initiateStkPush } from '@/lib/intasend';
import { createPaymentInvoice } from '@/lib/payment-invoices';
import {
  buildSubscriptionApiRef,
  getSubscriptionPrice,
  getUserSubscriptionSnapshot,
  parsePaidPlan,
  PLAN_LIMITS,
  checkSubscription,
} from '@/modules/subscriptions';

const subscribeSchema = z.object({
  plan: z.enum(['basic', 'pro', 'enterprise']),
  phoneNumber: z.string().min(9),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getUserSubscriptionSnapshot(user.id);

    const [importAccess, attachmentAccess, analyticsAccess] = await Promise.all([
      checkSubscription(user.id, 'import_data'),
      checkSubscription(user.id, 'upload_attachment'),
      checkSubscription(user.id, 'advanced_analytics'),
    ]);

    return NextResponse.json({
      subscription,
      limits: PLAN_LIMITS[subscription.plan],
      features: {
        import_data: importAccess,
        upload_attachment: attachmentAccess,
        advanced_analytics: analyticsAccess,
      },
    });
  } catch (error) {
    console.error('Subscriptions GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const paidPlan = parsePaidPlan(parsed.data.plan);
    if (!paidPlan) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const price = getSubscriptionPrice(paidPlan);
    const apiRef = buildSubscriptionApiRef(user.id, paidPlan);

    const payment = await initiateStkPush({
      amount: price.toString(),
      phone_number: parsed.data.phoneNumber,
      api_ref: apiRef,
    });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await createPaymentInvoice({
      invoiceId: payment.invoice.invoice_id,
      amount: price,
      phoneNumber: parsed.data.phoneNumber,
      expiresAt,
      metadata: {
        type: 'subscription',
        plan: paidPlan,
        userId: user.id,
        apiRef,
        paymentProvider: payment.invoice.provider,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription payment request sent',
      data: {
        plan: paidPlan,
        amount: price,
        invoiceId: payment.invoice.invoice_id,
        state: payment.invoice.state,
        apiRef,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Subscriptions POST error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to start subscription payment',
      },
      { status: 500 }
    );
  }
}
