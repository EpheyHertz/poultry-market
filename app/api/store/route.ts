import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createStore, getStoreByOwner } from '@/lib/store-service';

// GET /api/store — get current user's store
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getStoreByOwner(user.id);
    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 });

    return NextResponse.json(store);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch store' }, { status: 500 });
  }
}

// POST /api/store — create a new store
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['SELLER', 'COMPANY'].includes(user.role)) {
      return NextResponse.json({ error: 'Only sellers and companies can create stores' }, { status: 403 });
    }

    const body = await request.json();
    const { storeName, storeDescription, logo, bannerImage, location, contactPhone, socialLinks, themeColor } = body;

    if (!storeName || storeName.length < 2) {
      return NextResponse.json({ error: 'Store name is required (min 2 chars)' }, { status: 400 });
    }

    // Generate slug from name
    const baseSlug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);
    const storeSlug = `${baseSlug}-${Date.now().toString(36)}`;

    const storeType = user.role === 'COMPANY' ? 'COMPANY' : 'SELLER';

    const store = await createStore({
      ownerId: user.id,
      storeName,
      storeSlug,
      storeDescription,
      logo,
      bannerImage,
      location,
      contactPhone,
      socialLinks,
      themeColor,
      storeType,
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Store slug already taken' || error.message === 'User already owns a store') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create store' }, { status: 500 });
  }
}

// PUT /api/store — update current user's store
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getStoreByOwner(user.id);
    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 });

    const body = await request.json();
    const { storeName, storeDescription, logo, bannerImage, location, contactPhone, socialLinks, themeColor } = body;

    const { updateStore } = await import('@/lib/store-service');
    const updated = await updateStore(store.id, user.id, {
      storeName,
      storeDescription,
      logo,
      bannerImage,
      location,
      contactPhone,
      socialLinks,
      themeColor,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update store' }, { status: 500 });
  }
}
