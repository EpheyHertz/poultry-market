import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/market-prices — public market price index
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const region = searchParams.get('region') || '';

    const where: any = {};
    if (category) where.category = category;
    if (region) where.region = { contains: region, mode: 'insensitive' };

    // Get latest price for each category+region combination
    const prices = await prisma.marketPrice.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    // Deduplicate — keep latest per category+region
    const latest = new Map<string, typeof prices[0]>();
    for (const price of prices) {
      const key = `${price.category}:${price.region}`;
      if (!latest.has(key)) latest.set(key, price);
    }

    // Also compute platform averages from active product listings
    const productAverages = await prisma.product.groupBy({
      by: ['type'],
      where: { isActive: true, price: { gt: 0 } },
      _avg: { price: true },
      _min: { price: true },
      _max: { price: true },
      _count: true,
    });

    return NextResponse.json({
      marketPrices: Array.from(latest.values()),
      platformAverages: productAverages.map((p) => ({
        category: p.type,
        averagePrice: Math.round((p._avg.price || 0) * 100) / 100,
        minPrice: p._min.price || 0,
        maxPrice: p._max.price || 0,
        listingCount: p._count,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch market prices' }, { status: 500 });
  }
}

// POST /api/market-prices — admin manual price entry
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { category, region, averagePrice, minPrice, maxPrice, unit } = body;

    if (!category || !region || !averagePrice) {
      return NextResponse.json({ error: 'category, region, and averagePrice required' }, { status: 400 });
    }

    const price = await prisma.marketPrice.create({
      data: {
        category,
        region,
        averagePrice: parseFloat(averagePrice),
        minPrice: minPrice ? parseFloat(minPrice) : 0,
        maxPrice: maxPrice ? parseFloat(maxPrice) : 0,
        unit: unit || 'per kg',
        source: 'MANUAL',
        updatedBy: user.id,
      },
    });

    return NextResponse.json(price, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create price entry' }, { status: 500 });
  }
}
