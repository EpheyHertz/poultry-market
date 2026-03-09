import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStoreByOwner } from '@/lib/store-service';
import { prisma } from '@/lib/prisma';

// GET /api/store/wallet — get store wallet details
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getStoreByOwner(user.id);
    if (!store || !store.storeWallet) return NextResponse.json({ error: 'No store wallet' }, { status: 404 });

    const transactions = await prisma.storeWalletTransaction.findMany({
      where: { walletId: store.storeWallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      wallet: store.storeWallet,
      transactions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch wallet' }, { status: 500 });
  }
}
