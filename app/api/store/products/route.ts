import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStoreByOwner } from '@/lib/store-service';
import { prisma } from '@/lib/prisma';

// GET /api/store/products — list products for current user's store
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getStoreByOwner(user.id);
    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: any = { storeId: store.id };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          categories: { include: { category: true } },
          _count: { select: { reviews: true, orderItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/store/products — create product for current user's store
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getStoreByOwner(user.id);
    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 });

    const body = await request.json();
    const { name, description, price, stock, images, type, categoryIds, sku, unitType, vaccinationStatus } = body;

    if (!name || !price || price <= 0) {
      return NextResponse.json({ error: 'Name and valid price are required' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        images: images || [],
        type: type || 'CHICKEN_MEAT',
        sellerId: user.id,
        storeId: store.id,
        sku: sku || null,
        unitType: unitType || null,
        vaccinationStatus: vaccinationStatus || null,
        isActive: true,
        categories: categoryIds?.length
          ? { create: categoryIds.map((catId: string) => ({ categoryId: catId })) }
          : undefined,
      },
      include: { categories: { include: { category: true } } },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}
