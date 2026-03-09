import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStoreByOwner } from '@/lib/store-service';
import { prisma } from '@/lib/prisma';

// GET /api/store/withdrawals — list withdrawals for my store
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getStoreByOwner(user.id);
    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const [withdrawals, total] = await Promise.all([
      prisma.storeWithdrawal.findMany({
        where: { storeId: store.id },
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.storeWithdrawal.count({ where: { storeId: store.id } }),
    ]);

    return NextResponse.json({
      withdrawals,
      wallet: store.storeWallet,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch withdrawals' }, { status: 500 });
  }
}

// POST /api/store/withdrawals — request a withdrawal
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getStoreByOwner(user.id);
    if (!store || !store.storeWallet) return NextResponse.json({ error: 'No store or wallet found' }, { status: 404 });

    const body = await request.json();
    const { amount, method, accountName, mpesaNumber, mpesaTillNumber, bankName, bankAccount, bankCode, paypalEmail } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
    }
    if (!method || !['MPESA', 'MPESA_TILL', 'BANK_TRANSFER', 'PAYPAL'].includes(method)) {
      return NextResponse.json({ error: 'Valid withdrawal method required' }, { status: 400 });
    }
    if (amount > store.storeWallet.availableBalance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Validate method-specific fields
    if (method === 'MPESA' && !mpesaNumber) {
      return NextResponse.json({ error: 'M-Pesa number required' }, { status: 400 });
    }
    if (method === 'MPESA_TILL' && !mpesaTillNumber) {
      return NextResponse.json({ error: 'M-Pesa till number required' }, { status: 400 });
    }
    if (method === 'BANK_TRANSFER' && (!bankName || !bankAccount || !bankCode)) {
      return NextResponse.json({ error: 'Bank details required' }, { status: 400 });
    }
    if (method === 'PAYPAL' && !paypalEmail) {
      return NextResponse.json({ error: 'PayPal email required' }, { status: 400 });
    }

    // Deduct from available and create withdrawal request
    const [withdrawal] = await prisma.$transaction([
      prisma.storeWithdrawal.create({
        data: {
          storeId: store.id,
          amount: parseFloat(amount),
          method,
          accountName: accountName || '',
          mpesaNumber: mpesaNumber || null,
          mpesaTillNumber: mpesaTillNumber || null,
          bankName: bankName || null,
          bankAccount: bankAccount || null,
          bankCode: bankCode || null,
          paypalEmail: paypalEmail || null,
        },
      }),
      prisma.storeWallet.update({
        where: { id: store.storeWallet.id },
        data: {
          availableBalance: { decrement: parseFloat(amount) },
          pendingBalance: { increment: parseFloat(amount) },
        },
      }),
    ]);

    return NextResponse.json(withdrawal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create withdrawal' }, { status: 500 });
  }
}
