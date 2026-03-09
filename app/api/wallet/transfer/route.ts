import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { intraWalletTransfer } from '@/lib/payment-service';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';

const transferSchema = z.object({
  fromWalletId: z.string().min(1),
  toWalletId: z.string().min(1),
  amount: z.number().positive().min(1),
  narrative: z.string().optional(),
});

/**
 * POST /api/wallet/transfer
 * Transfer funds between wallets (intra-platform).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = getClientIdentifier(request);
    const rl = checkRateLimit(`transfer:${clientId}`, RATE_LIMITS.checkout);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fromWalletId, toWalletId, amount, narrative } = parsed.data;

    if (fromWalletId === toWalletId) {
      return NextResponse.json({ error: 'Cannot transfer to the same wallet' }, { status: 400 });
    }

    const result = await intraWalletTransfer({
      fromWalletId,
      toWalletId,
      userId: user.id,
      amount,
      narrative,
    });

    return NextResponse.json({
      success: true,
      outTransaction: result.outTransaction,
      inTransaction: result.inTransaction,
    });
  } catch (error) {
    console.error('Transfer error:', error);
    const msg = error instanceof Error ? error.message : 'Transfer failed';
    const status = msg.includes('Unauthorized') ? 403 : msg.includes('Insufficient') ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
