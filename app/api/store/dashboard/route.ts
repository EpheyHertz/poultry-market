import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStoreByOwner, getStoreDashboard } from '@/lib/store-service';

// GET /api/store/dashboard — store owner dashboard data
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getStoreByOwner(user.id);
    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 });

    const dashboard = await getStoreDashboard(store.id);
    return NextResponse.json(dashboard);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard' }, { status: 500 });
  }
}
