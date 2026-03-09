import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getWallet, getTransactionHistory } from '@/lib/payment-service';

/**
 * GET /api/wallet/[id]
 * Get wallet details with synced balances and transaction history.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;

    // Admin can view any wallet; others only their own
    const userId = user.role === 'ADMIN' ? undefined : user.id;
    const wallet = await getWallet(id, userId);

    const history = await getTransactionHistory(id, wallet.userId, {
      page,
      limit,
      type,
      status,
    });

    return NextResponse.json({
      wallet,
      transactions: history.transactions,
      pagination: history.pagination,
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to get wallet';
    const status = msg.includes('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
