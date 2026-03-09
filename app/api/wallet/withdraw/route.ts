import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  withdrawToMpesa,
  withdrawToB2B,
  withdrawToBank,
  BANK_CODES,
} from '@/lib/payment-service';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';

const mpesaSchema = z.object({
  method: z.literal('mpesa'),
  walletId: z.string().min(1),
  amount: z.number().positive().min(10).max(150000),
  recipientName: z.string().min(1),
  mpesaNumber: z.string().min(9).max(15),
  narrative: z.string().optional(),
});

const b2bSchema = z.object({
  method: z.literal('b2b'),
  walletId: z.string().min(1),
  amount: z.number().positive().min(10),
  businessName: z.string().min(1),
  accountType: z.enum(['PayBill', 'TillNumber']),
  account: z.string().min(1),
  accountReference: z.string().optional(),
  narrative: z.string().optional(),
});

const bankSchema = z.object({
  method: z.literal('bank'),
  walletId: z.string().min(1),
  amount: z.number().positive().min(100),
  accountName: z.string().min(1),
  bankAccount: z.string().min(1),
  bankCode: z.string().min(1),
  narrative: z.string().optional(),
});

const withdrawSchema = z.discriminatedUnion('method', [mpesaSchema, b2bSchema, bankSchema]);

/**
 * POST /api/wallet/withdraw
 * Withdraw funds from wallet to M-Pesa, PayBill/Till, or Bank.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = getClientIdentifier(request);
    const rl = checkRateLimit(`withdraw:${clientId}`, RATE_LIMITS.checkout);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = withdrawSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.method === 'mpesa') {
      const result = await withdrawToMpesa({
        walletId: data.walletId,
        userId: user.id,
        amount: data.amount,
        recipientName: data.recipientName,
        mpesaNumber: data.mpesaNumber,
        narrative: data.narrative,
      });
      return NextResponse.json({
        success: true,
        transaction: result.transaction,
        message: 'M-Pesa withdrawal initiated.',
      });
    }

    if (data.method === 'b2b') {
      const result = await withdrawToB2B({
        walletId: data.walletId,
        userId: user.id,
        amount: data.amount,
        businessName: data.businessName,
        accountType: data.accountType,
        account: data.account,
        accountReference: data.accountReference,
        narrative: data.narrative,
      });
      return NextResponse.json({
        success: true,
        transaction: result.transaction,
        message: 'B2B payment initiated.',
      });
    }

    // Bank
    const result = await withdrawToBank({
      walletId: data.walletId,
      userId: user.id,
      amount: data.amount,
      accountName: data.accountName,
      bankAccount: data.bankAccount,
      bankCode: data.bankCode,
      narrative: data.narrative,
    });
    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      message: 'Bank transfer initiated.',
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    const msg = error instanceof Error ? error.message : 'Withdrawal failed';
    const status = msg.includes('Unauthorized') ? 403 : msg.includes('Insufficient') || msg.includes('cannot disburse') ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * GET /api/wallet/withdraw
 * Get supported bank codes.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      bankCodes: BANK_CODES,
      methods: ['mpesa', 'b2b', 'bank'],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch withdrawal info' }, { status: 500 });
  }
}
