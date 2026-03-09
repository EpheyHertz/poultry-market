import { NextResponse } from 'next/server';
import { listStores } from '@/lib/store-service';
import { NextRequest } from 'next/server';

// GET /api/store/browse — public listing of all active stores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await listStores({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined,
      storeType: (searchParams.get('type') as any) || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch stores' }, { status: 500 });
  }
}
