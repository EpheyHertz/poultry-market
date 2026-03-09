import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/withdrawals — list all withdrawal requests
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'PENDING';

    const where: any = {};
    if (status !== 'all') where.status = status;

    const [withdrawals, total] = await Promise.all([
      prisma.storeWithdrawal.findMany({
        where,
        include: {
          store: {
            select: { id: true, storeName: true, storeSlug: true, owner: { select: { name: true, email: true } } },
          },
        },
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.storeWithdrawal.count({ where }),
    ]);

    return NextResponse.json({
      withdrawals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch withdrawals' }, { status: 500 });
  }
}

// POST /api/admin/withdrawals — approve or reject withdrawal
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { withdrawalId, action, rejectionReason, transactionRef } = body;

    if (!withdrawalId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'withdrawalId and action (approve/reject) required' }, { status: 400 });
    }

    const withdrawal = await prisma.storeWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { store: { include: { storeWallet: true } } },
    });

    if (!withdrawal) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    if (withdrawal.status !== 'PENDING') {
      return NextResponse.json({ error: 'Withdrawal already processed' }, { status: 400 });
    }

    if (action === 'approve') {
      await prisma.$transaction([
        prisma.storeWithdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'APPROVED',
            processedAt: new Date(),
            processedBy: user.id,
            transactionRef: transactionRef || null,
          },
        }),
        prisma.storeWallet.update({
          where: { id: withdrawal.store.storeWallet!.id },
          data: {
            pendingBalance: { decrement: withdrawal.amount },
            totalWithdrawn: { increment: withdrawal.amount },
          },
        }),
        prisma.storeWalletTransaction.create({
          data: {
            walletId: withdrawal.store.storeWallet!.id,
            type: 'WITHDRAWAL',
            status: 'completed',
            amount: withdrawal.amount,
            fee: 0,
            netAmount: withdrawal.amount,
            narrative: `Withdrawal via ${withdrawal.method} - ${transactionRef || 'N/A'}`,
          },
        }),
      ]);

      return NextResponse.json({ message: 'Withdrawal approved' });
    } else {
      await prisma.$transaction([
        prisma.storeWithdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'REJECTED',
            processedAt: new Date(),
            processedBy: user.id,
            rejectionReason: rejectionReason || 'Rejected by admin',
          },
        }),
        // Return funds to available balance
        prisma.storeWallet.update({
          where: { id: withdrawal.store.storeWallet!.id },
          data: {
            pendingBalance: { decrement: withdrawal.amount },
            availableBalance: { increment: withdrawal.amount },
          },
        }),
      ]);

      return NextResponse.json({ message: 'Withdrawal rejected, funds returned' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process withdrawal' }, { status: 500 });
  }
}
