import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  listUserWallets,
  createUserWallet,
} from '@/lib/payment-service';
import { z } from 'zod';

const createWalletSchema = z.object({
  label: z.string().min(1).max(100),
  isPrimary: z.boolean().optional().default(false),
});

/**
 * GET /api/wallet
 * List current user's wallets.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const wallets = await listUserWallets(user.id);
    return NextResponse.json({ wallets });
  } catch (error) {
    console.error('List wallets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list wallets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wallet
 * Create a new wallet for the current user.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createWalletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const wallet = await createUserWallet({
      userId: user.id,
      label: parsed.data.label,
      isPrimary: parsed.data.isPrimary,
    });

    return NextResponse.json({ wallet }, { status: 201 });
  } catch (error) {
    console.error('Create wallet error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create wallet' },
      { status: 500 }
    );
  }
}
