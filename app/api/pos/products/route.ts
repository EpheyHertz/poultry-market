import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/pos/products
 * Search seller's products for POS system
 * Supports search by name, barcode, category
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const inStock = searchParams.get('inStock') === 'true';

    const where: any = {
      sellerId: user.id,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { customType: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && {
        categories: {
          some: {
            category: { slug: category },
          },
        },
      }),
      ...(inStock && { stock: { gt: 0 } }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          type: true,
          images: true,
          hasDiscount: true,
          discountType: true,
          discountAmount: true,
          discountStartDate: true,
          discountEndDate: true,
          categories: {
            include: { category: { select: { name: true, slug: true } } },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate effective price with discounts
    const productsWithEffectivePrice = products.map((product) => {
      let effectivePrice = product.price;
      const now = new Date();

      if (
        product.hasDiscount &&
        product.discountAmount &&
        (!product.discountStartDate || product.discountStartDate <= now) &&
        (!product.discountEndDate || product.discountEndDate >= now)
      ) {
        if (product.discountType === 'PERCENTAGE') {
          effectivePrice = product.price * (1 - product.discountAmount / 100);
        } else {
          effectivePrice = product.price - product.discountAmount;
        }
      }

      return {
        ...product,
        effectivePrice: Math.max(0, Math.round(effectivePrice * 100) / 100),
        image: product.images?.[0] || null,
      };
    });

    return NextResponse.json({
      products: productsWithEffectivePrice,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[POS Products GET]', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
