import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createRefund, listRefunds, getRefundDetails } from '@/lib/payment-service';
import { z } from 'zod';

const refundSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID required'),
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
  reasonDetails: z.string().optional(),
  walletId: z.string().optional(),
});

/**
 * POST /api/wallet/refund
 * Create a refund / chargeback via IntaSend.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await createRefund({
      userId: user.id,
      invoiceId: parsed.data.invoiceId,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      reasonDetails: parsed.data.reasonDetails,
      walletId: parsed.data.walletId,
    });

    return NextResponse.json({ success: true, refund: result });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Refund failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/refund
 * Admin: list all refunds.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chargebackId = searchParams.get('id');

    if (chargebackId) {
      const detail = await getRefundDetails(chargebackId);
      return NextResponse.json({ refund: detail });
    }

    const refunds = await listRefunds();
    return NextResponse.json({ refunds });
  } catch (error) {
    console.error('List refunds error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch refunds' },
      { status: 500 }
    );
  }
}
