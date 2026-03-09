import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const updateCommissionSchema = z.object({
  sellerId: z.string().min(1),
  rate: z.number().min(0).max(100),
});

/**
 * GET /api/admin/commissions
 * List all seller commission configurations
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get all sellers with their commission data
    const sellers = await prisma.user.findMany({
      where: {
        role: { in: ['SELLER', 'COMPANY'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        sellerCommission: true,
        _count: {
          select: {
            products: true,
            sellerOrders: true,
            sales: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.user.count({
      where: { role: { in: ['SELLER', 'COMPANY'] }, isActive: true },
    });

    // Calculate commission totals
    const totals = await prisma.sellerCommission.aggregate({
      _sum: { totalCommission: true, totalSales: true },
      _avg: { rate: true },
    });

    return NextResponse.json({
      sellers: sellers.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        avatar: s.avatar,
        commission: s.sellerCommission || {
          rate: 5,
          totalCommission: 0,
          totalSales: 0,
          isActive: true,
        },
        stats: {
          products: s._count.products,
          orders: s._count.sellerOrders,
          posSales: s._count.sales,
        },
      })),
      totals: {
        totalCommission: totals._sum.totalCommission || 0,
        totalSalesVolume: totals._sum.totalSales || 0,
        averageRate: totals._avg.rate || 5,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[Commission GET]', error);
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/commissions
 * Update a seller's commission rate
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateCommissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sellerId, rate } = parsed.data;

    // Verify seller exists
    const seller = await prisma.user.findFirst({
      where: {
        id: sellerId,
        role: { in: ['SELLER', 'COMPANY'] },
      },
    });

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const commission = await prisma.sellerCommission.upsert({
      where: { sellerId },
      create: {
        sellerId,
        rate,
        setBy: user.id,
      },
      update: {
        rate,
        setBy: user.id,
      },
    });

    return NextResponse.json({ commission });
  } catch (error) {
    console.error('[Commission PUT]', error);
    return NextResponse.json({ error: 'Failed to update commission' }, { status: 500 });
  }
}
