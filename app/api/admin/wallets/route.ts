import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/wallets
 * Admin: list all wallets on the platform with user info and aggregates.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { label: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          _count: { select: { transactions: true } },
        },
        orderBy: { currentBalance: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.wallet.count({ where }),
    ]);

    // Aggregates
    const aggregates = await prisma.wallet.aggregate({
      where: { isActive: true },
      _sum: { currentBalance: true, availableBalance: true },
      _count: true,
    });

    // Transaction volume (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentVolume = await prisma.walletTransaction.aggregate({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: 'COMPLETED',
        type: { in: ['DEPOSIT', 'SALE_CREDIT'] },
      },
      _sum: { amount: true },
      _count: true,
    });

    const recentWithdrawals = await prisma.walletTransaction.aggregate({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['COMPLETED', 'PROCESSING'] },
        type: { in: ['WITHDRAWAL_MPESA', 'WITHDRAWAL_B2B', 'WITHDRAWAL_BANK'] },
      },
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      wallets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      aggregates: {
        totalBalance: aggregates._sum.currentBalance || 0,
        totalAvailable: aggregates._sum.availableBalance || 0,
        walletCount: aggregates._count,
        monthlyDeposits: recentVolume._sum.amount || 0,
        monthlyDepositCount: recentVolume._count,
        monthlyWithdrawals: recentWithdrawals._sum.amount || 0,
        monthlyWithdrawalCount: recentWithdrawals._count,
      },
    });
  } catch (error) {
    console.error('Admin wallets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}
