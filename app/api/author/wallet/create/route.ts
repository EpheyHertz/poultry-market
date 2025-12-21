import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createWallet, SUPPORT_CONFIG } from '@/lib/intasend-wallets';

/**
 * POST /api/author/wallet/create
 * Create an IntaSend wallet for the authenticated author
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get author profile
    const authorProfile = await prisma.authorProfile.findUnique({
      where: { userId: user.id },
      include: { wallet: true },
    });

    if (!authorProfile) {
      return NextResponse.json(
        { error: 'Author profile not found. Please create an author profile first.' },
        { status: 404 }
      );
    }

    // Check if wallet already exists
    if (authorProfile.wallet) {
      return NextResponse.json(
        { error: 'You already have a support wallet set up.' },
        { status: 400 }
      );
    }

    // Parse request body for optional M-Pesa number
    const body = await request.json().catch(() => ({}));
    const { mpesaNumber } = body;

    // Create IntaSend wallet
    const walletLabel = `PMK-Author-${authorProfile.username}`;
    const intasendWallet = await createWallet(walletLabel);

    // Save wallet to database
    const wallet = await prisma.authorWallet.create({
      data: {
        authorProfileId: authorProfile.id,
        intasendWalletId: intasendWallet.wallet_id,
        currency: intasendWallet.currency,
        label: intasendWallet.label,
        canDisburse: Boolean(intasendWallet.can_disburse),
        currentBalance: parseFloat(intasendWallet.current_balance) || 0,
        availableBalance: parseFloat(intasendWallet.available_balance) || 0,
        mpesaNumber: mpesaNumber || null,
        dailyWithdrawLimit: SUPPORT_CONFIG.DAILY_WITHDRAWAL_LIMIT,
        status: 'ACTIVE',
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Support wallet created successfully!',
      wallet: {
        id: wallet.id,
        walletId: wallet.intasendWalletId,
        currency: wallet.currency,
        balance: wallet.availableBalance,
        status: wallet.status,
      },
    });

  } catch (error) {
    console.error('Error creating author wallet:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet. Please try again.' },
      { status: 500 }
    );
  }
}
