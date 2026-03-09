import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { depositViaMpesa, depositViaCheckout } from '@/lib/payment-service';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';

const fundMpesaSchema = z.object({
  walletId: z.string().min(1),
  amount: z.number().positive().min(10).max(150000),
  phoneNumber: z.string().min(9).max(15),
  method: z.literal('mpesa'),
  narrative: z.string().optional(),
});

const fundCheckoutSchema = z.object({
  walletId: z.string().min(1),
  amount: z.number().positive().min(10).max(150000),
  email: z.string().email(),
  redirectUrl: z.string().url(),
  method: z.literal('checkout'),
  narrative: z.string().optional(),
});

const fundSchema = z.discriminatedUnion('method', [fundMpesaSchema, fundCheckoutSchema]);

/**
 * POST /api/wallet/fund
 * Fund a wallet via M-Pesa STK Push or Checkout.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    const clientId = getClientIdentifier(request);
    const rl = checkRateLimit(`fund:${clientId}`, RATE_LIMITS.checkout);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = fundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.method === 'mpesa') {
      const result = await depositViaMpesa({
        walletId: data.walletId,
        userId: user.id,
        amount: data.amount,
        phoneNumber: data.phoneNumber,
        narrative: data.narrative,
      });

      return NextResponse.json({
        success: true,
        transaction: result.transaction,
        invoiceId: result.invoiceId,
        message: 'STK Push sent. Complete payment on your phone.',
      });
    }

    // Checkout
    const result = await depositViaCheckout({
      walletId: data.walletId,
      userId: user.id,
      amount: data.amount,
      email: data.email,
      redirectUrl: data.redirectUrl,
      narrative: data.narrative,
    });

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      checkoutUrl: result.checkoutUrl,
      checkoutId: result.checkoutId,
      message: 'Redirect user to the checkout URL.',
    });
  } catch (error) {
    console.error('Fund wallet error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Funding failed' },
      { status: 500 }
    );
  }
}
