import { updateInvoicePaymentStatus } from '@/lib/payment-invoices';
import {
  activateSubscription,
  deactivateSubscription,
  parseSubscriptionApiRef,
} from './service';

export interface IntaSendSubscriptionWebhookPayload {
  invoice_id: string;
  state: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'RETRY';
  provider: string;
  api_ref: string;
  mpesa_reference?: string;
  failed_reason: string | null;
  failed_code: string | null;
  created_at: string;
  updated_at: string;
}

export async function handleSubscriptionPaymentWebhook(payload: IntaSendSubscriptionWebhookPayload) {
  const parsedRef = parseSubscriptionApiRef(payload.api_ref);

  if (!parsedRef) {
    return {
      handled: false,
      reason: 'Not a subscription payment reference',
    };
  }

  const paymentReference = payload.mpesa_reference || payload.invoice_id;

  if (payload.state === 'COMPLETE') {
    const subscription = await activateSubscription({
      userId: parsedRef.userId,
      plan: parsedRef.plan,
      intaSendRef: payload.invoice_id,
      paymentReference,
      startsAt: new Date(payload.updated_at || Date.now()),
    });

    await updateInvoicePaymentStatus(payload.invoice_id, 'COMPLETE');

    return {
      handled: true,
      action: 'activated',
      subscription,
    };
  }

  if (payload.state === 'FAILED') {
    const subscription = await deactivateSubscription({
      userId: parsedRef.userId,
      plan: parsedRef.plan,
      intaSendRef: payload.invoice_id,
      paymentReference,
    });

    await updateInvoicePaymentStatus(payload.invoice_id, 'FAILED');

    return {
      handled: true,
      action: 'deactivated',
      subscription,
    };
  }

  await updateInvoicePaymentStatus(payload.invoice_id, 'PENDING');

  return {
    handled: true,
    action: 'pending',
  };
}
