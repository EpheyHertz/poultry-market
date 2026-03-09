import { NextRequest, NextResponse } from 'next/server';
import { getStoreBySlug, getStoreProducts } from '@/lib/store-service';

// GET /api/store/[slug] — public store info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const store = await getStoreBySlug(slug);
    if (!store || store.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;

    const productsData = await getStoreProducts(store.id, { page, limit, search, category });

    return NextResponse.json({
      store,
      products: productsData.products,
      pagination: productsData.pagination,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch store' }, { status: 500 });
  }
}
