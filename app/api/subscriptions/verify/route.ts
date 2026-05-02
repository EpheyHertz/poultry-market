import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { checkPaymentStatus } from '@/lib/intasend';
import { findPaymentInvoice, updateInvoicePaymentStatus } from '@/lib/payment-invoices';
import { activateSubscription, deactivateSubscription } from '@/modules/subscriptions';

const schema = z.object({
  invoiceId: z.string().min(1),
});

function parseMetadata(value: string | null): Record<string, unknown> | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const invoice = await findPaymentInvoice(parsed.data.invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Payment invoice not found' }, { status: 404 });
    }

    const metadata = parseMetadata(invoice.metadata);
    if (!metadata || metadata.type !== 'subscription' || metadata.userId !== user.id) {
      return NextResponse.json({ error: 'Invoice does not belong to this user subscription flow' }, { status: 403 });
    }

    const plan = String(metadata.plan || '').toUpperCase();
    if (!['BASIC', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return NextResponse.json({ error: 'Unable to resolve subscription plan from payment invoice' }, { status: 400 });
    }

    const status = await checkPaymentStatus(parsed.data.invoiceId);

    if (status.invoice.state === 'COMPLETE') {
      await updateInvoicePaymentStatus(parsed.data.invoiceId, 'COMPLETE');

      const subscription = await activateSubscription({
        userId: user.id,
        plan: plan as 'BASIC' | 'PRO' | 'ENTERPRISE',
        intaSendRef: status.invoice.invoice_id,
        paymentReference: status.invoice.mpesa_reference || status.invoice.invoice_id,
        startsAt: new Date(status.invoice.updated_at || Date.now()),
      });

      return NextResponse.json({
        success: true,
        state: status.invoice.state,
        subscription,
      });
    }

    if (status.invoice.state === 'FAILED') {
      await updateInvoicePaymentStatus(parsed.data.invoiceId, 'FAILED');

      const subscription = await deactivateSubscription({
        userId: user.id,
        plan: plan as 'BASIC' | 'PRO' | 'ENTERPRISE',
        intaSendRef: status.invoice.invoice_id,
        paymentReference: status.invoice.mpesa_reference || status.invoice.invoice_id,
      });

      return NextResponse.json({
        success: false,
        state: status.invoice.state,
        subscription,
      });
    }

    await updateInvoicePaymentStatus(parsed.data.invoiceId, 'PENDING');

    return NextResponse.json({
      success: false,
      state: status.invoice.state,
      message: 'Payment is still pending',
    });
  } catch (error) {
    console.error('Subscription verify error:', error);
    return NextResponse.json({ error: 'Failed to verify subscription payment' }, { status: 500 });
  }
}
