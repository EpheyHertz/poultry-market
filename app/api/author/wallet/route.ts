import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getWalletDetails, SUPPORT_CONFIG } from '@/lib/intasend-wallets';

/**
 * GET /api/author/wallet
 * Get wallet details for the authenticated author
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get author profile with wallet
    const authorProfile = await prisma.authorProfile.findUnique({
      where: { userId: user.id },
      include: { 
        wallet: {
          include: {
            _count: {
              select: {
                transactions: { where: { status: 'COMPLETED' } },
                withdrawals: true,
              },
            },
          },
        },
      },
    });

    if (!authorProfile) {
      return NextResponse.json(
        { error: 'Author profile not found' },
        { status: 404 }
      );
    }

    if (!authorProfile.wallet) {
      return NextResponse.json({
        hasWallet: false,
        message: 'No support wallet set up yet',
      });
    }

    const wallet = authorProfile.wallet;

    // Sync balance from IntaSend (optional, can be expensive)
    let syncedBalance = {
      current: wallet.currentBalance,
      available: wallet.availableBalance,
    };

    try {
      const intasendWallet = await getWalletDetails(wallet.intasendWalletId);
      syncedBalance = {
        current: parseFloat(intasendWallet.current_balance) || 0,
        available: parseFloat(intasendWallet.available_balance) || 0,
      };

      // Update local balance cache
      await prisma.authorWallet.update({
        where: { id: wallet.id },
        data: {
          currentBalance: syncedBalance.current,
          availableBalance: syncedBalance.available,
          lastSyncedAt: new Date(),
        },
      });
    } catch {
      console.warn('Failed to sync balance from IntaSend, using cached values');
    }

    // Check if daily limit should reset
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let dailyWithdrawnAmount = wallet.dailyWithdrawnAmount;
    if (wallet.lastWithdrawalDate && wallet.lastWithdrawalDate < today) {
      // Reset daily amount
      dailyWithdrawnAmount = 0;
      await prisma.authorWallet.update({
        where: { id: wallet.id },
        data: { dailyWithdrawnAmount: 0 },
      });
    }

    // Get recent transactions
    const recentTransactions = await prisma.supportTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        supporter: {
          select: { name: true, avatar: true },
        },
        blogPost: {
          select: { title: true, slug: true },
        },
      },
    });

    // Get stats
    const stats = await prisma.supportTransaction.aggregate({
      where: { walletId: wallet.id, status: 'COMPLETED' },
      _sum: { amount: true, netAmount: true, platformFee: true },
      _count: true,
    });

    const uniqueSupporters = await prisma.supportTransaction.groupBy({
      by: ['supporterId'],
      where: { walletId: wallet.id, status: 'COMPLETED', supporterId: { not: null } },
    });

    return NextResponse.json({
      hasWallet: true,
      authorProfileId: authorProfile.id,
      wallet: {
        id: wallet.id,
        intasendWalletId: wallet.intasendWalletId,
        currency: wallet.currency,
        status: wallet.status,
        mpesaNumber: wallet.mpesaNumber,
        balance: {
          current: syncedBalance.current,
          available: syncedBalance.available,
        },
        limits: {
          dailyWithdrawLimit: wallet.dailyWithdrawLimit,
          dailyWithdrawnAmount,
          remainingDaily: wallet.dailyWithdrawLimit - dailyWithdrawnAmount,
          minWithdrawal: SUPPORT_CONFIG.MIN_WITHDRAWAL_AMOUNT,
        },
        stats: {
          totalReceived: stats._sum.amount || 0,
          totalAfterFees: stats._sum.netAmount || 0,
          platformFeePaid: stats._sum.platformFee || 0,
          totalWithdrawn: wallet.totalWithdrawn,
          transactionsCount: stats._count || 0,
          uniqueSupporters: uniqueSupporters.length,
        },
        recentTransactions: recentTransactions.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          netAmount: tx.netAmount,
          supporterName: tx.isAnonymous ? 'Anonymous' : (tx.supporter?.name || tx.supporterName || 'Anonymous'),
          supporterAvatar: tx.isAnonymous ? null : tx.supporter?.avatar,
          message: tx.message,
          blogPost: tx.blogPost,
          status: tx.status,
          createdAt: tx.createdAt,
          completedAt: tx.completedAt,
        })),
        createdAt: wallet.createdAt,
        lastSyncedAt: wallet.lastSyncedAt,
      },
    });

  } catch (error) {
    console.error('Error getting author wallet:', error);
    return NextResponse.json(
      { error: 'Failed to get wallet details' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/author/wallet
 * Update wallet settings (M-Pesa number)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mpesaNumber } = body;

    const wallet = await prisma.authorWallet.findFirst({
      where: {
        authorProfile: { userId: user.id },
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.authorWallet.update({
      where: { id: wallet.id },
      data: { mpesaNumber },
    });

    return NextResponse.json({
      success: true,
      mpesaNumber: updated.mpesaNumber,
    });

  } catch (error) {
    console.error('Error updating wallet:', error);
    return NextResponse.json(
      { error: 'Failed to update wallet' },
      { status: 500 }
    );
  }
}
