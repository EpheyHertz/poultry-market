import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { confirmDeposit } from '@/lib/payment-service';

/**
 * POST /api/wallet/fund/confirm
 * Confirm a pending deposit after STK push or checkout completion.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoiceId } = await request.json();
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
    }

    const tx = await confirmDeposit(invoiceId);

    return NextResponse.json({
      success: true,
      transaction: tx,
      status: tx?.status,
    });
  } catch (error) {
    console.error('Confirm deposit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Confirmation failed' },
      { status: 500 }
    );
  }
}
