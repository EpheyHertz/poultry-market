import { NextRequest, NextResponse } from 'next/server';
import { reconcileExpiredSubscriptions } from '@/modules/subscriptions';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const provided =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  return provided === secret;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    const expiredCount = await reconcileExpiredSubscriptions();
    return NextResponse.json({ success: true, expiredCount });
  } catch (error) {
    console.error('Subscription reconcile cron error:', error);
    return NextResponse.json({ error: 'Failed to reconcile subscriptions' }, { status: 500 });
  }
}
