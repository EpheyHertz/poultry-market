import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/analytics/enhanced
 * Enhanced analytics for seller and admin dashboards
 * Includes: revenue chart, best-selling products, conversion rate, repeat customers
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30');
    const granularity = searchParams.get('granularity') || (period <= 31 ? 'daily' : 'monthly');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    if (user.role === 'ADMIN') {
      return NextResponse.json(await getAdminAnalytics(startDate, period, granularity));
    } else {
      return NextResponse.json(await getSellerAnalytics(user.id, startDate, period, granularity));
    }
  } catch (error) {
    console.error('[Enhanced Analytics]', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

async function getSellerAnalytics(sellerId: string, startDate: Date, period: number, granularity: string) {
  const now = new Date();

  const [
    revenueData,
    orderStats,
    topProducts,
    repeatCustomers,
    totalCustomers,
    posSalesStats,
    reviewStats,
  ] = await Promise.all([
    // Revenue over time (orders + POS)
    getRevenueChart(sellerId, startDate, granularity),

    // Order statistics
    prisma.order.aggregate({
      where: {
        sellerId,
        createdAt: { gte: startDate },
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
      _sum: { total: true },
      _count: true,
    }),

    // Best-selling products (combined orders + POS)
    getTopSellingProducts(sellerId, startDate),

    // Repeat customers (ordered more than once)
    prisma.order.groupBy({
      by: ['customerId'],
      where: {
        sellerId,
        createdAt: { gte: startDate },
      },
      _count: true,
      having: {
        customerId: { _count: { gt: 1 } },
      },
    }),

    // Total unique customers
    prisma.order.groupBy({
      by: ['customerId'],
      where: {
        sellerId,
        createdAt: { gte: startDate },
      },
    }),

    // POS sales stats
    prisma.sale.aggregate({
      where: {
        sellerId,
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      _sum: { total: true },
      _count: true,
    }),

    // Average rating
    prisma.review.aggregate({
      where: {
        product: { sellerId },
        createdAt: { gte: startDate },
      },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const totalOrderRevenue = orderStats._sum.total || 0;
  const totalPOSRevenue = posSalesStats._sum.total || 0;
  const totalRevenue = totalOrderRevenue + totalPOSRevenue;
  const totalOrders = (orderStats._count || 0) + (posSalesStats._count || 0);
  const totalUniqueCustomers = totalCustomers.length;
  const repeatCustomerCount = repeatCustomers.length;
  const conversionRate = totalUniqueCustomers > 0
    ? Math.round((repeatCustomerCount / totalUniqueCustomers) * 100)
    : 0;

  return {
    summary: {
      totalRevenue,
      onlineRevenue: totalOrderRevenue,
      posRevenue: totalPOSRevenue,
      orderCount: totalOrders,
      onlineOrderCount: orderStats._count || 0,
      posSaleCount: posSalesStats._count || 0,
      averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      uniqueCustomers: totalUniqueCustomers,
      repeatCustomers: repeatCustomerCount,
      conversionRate,
      averageRating: reviewStats._avg.rating ? Math.round(reviewStats._avg.rating * 10) / 10 : 0,
      reviewCount: reviewStats._count || 0,
    },
    revenueChart: revenueData,
    topProducts,
  };
}

async function getAdminAnalytics(startDate: Date, period: number, granularity: string) {
  const now = new Date();

  const [
    totalGMV,
    orderCount,
    activeSellers,
    totalSellers,
    dailyTransactions,
    commissionData,
    userStats,
    topSellersData,
    revenueChart,
    salesByDay,
    totalProducts,
    totalUsers,
    topProductsData,
  ] = await Promise.all([
    // Total GMV
    Promise.all([
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['DELIVERED', 'COMPLETED', 'PAID', 'APPROVED'] },
        },
        _sum: { total: true },
      }),
      prisma.sale.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
        _sum: { total: true },
      }),
    ]),

    // Order count
    prisma.order.count({
      where: { createdAt: { gte: startDate } },
    }),

    // Active sellers (with sales in period)
    prisma.user.count({
      where: {
        role: { in: ['SELLER', 'COMPANY'] },
        isActive: true,
        OR: [
          { sellerOrders: { some: { createdAt: { gte: startDate } } } },
          { sales: { some: { createdAt: { gte: startDate } } } },
        ],
      },
    }),

    // Total sellers
    prisma.user.count({
      where: { role: { in: ['SELLER', 'COMPANY'] } },
    }),

    // Today's order transactions
    prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
    }),

    // Commission data
    Promise.all([
      prisma.sellerCommission.aggregate({
        _avg: { rate: true },
      }),
      prisma.sellerCommission.findMany({
        select: { rate: true },
      }),
    ]),

    // User stats by role
    prisma.user.groupBy({
      by: ['role'],
      _count: true,
    }),

    // Top sellers by revenue
    getTopSellers(startDate),

    // Revenue chart
    getRevenueChart(undefined, startDate, 'monthly'),

    // POS sales today
    prisma.sale.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
    }),

    // Total products
    prisma.product.count(),

    // Total users
    prisma.user.count(),

    // Top products across all sellers
    getTopProductsAllSellers(startDate),
  ]);

  const gmv = (totalGMV[0]._sum.total || 0) + (totalGMV[1]._sum.total || 0);
  const avgCommRate = commissionData[0]._avg.rate || 5;
  const commissionEarnings = Math.round(gmv * (avgCommRate / 100));

  return {
    summary: {
      totalGMV: gmv,
      totalOrders: orderCount,
      activeSellers,
      totalSellers,
      dailyTransactions: dailyTransactions + salesByDay,
      commissionEarnings,
      avgCommissionRate: Math.round(avgCommRate * 10) / 10,
      totalProducts,
      totalUsers,
      avgOrderValue: orderCount > 0 ? Math.round(gmv / orderCount) : 0,
    },
    usersByRole: userStats.map((u) => ({
      role: u.role,
      count: u._count,
    })),
    topSellers: topSellersData.map((s) => ({
      id: s.id,
      name: s.name,
      role: 'SELLER',
      revenue: s.totalRevenue,
      orderCount: s.orderCount,
    })),
    topProducts: topProductsData,
    revenueChart: revenueChart.map((r) => ({
      date: r.date,
      revenue: r.total,
    })),
  };
}

async function getRevenueChart(sellerId: string | undefined, startDate: Date, granularity: string) {
  try {
    // Get order revenue by date
    const orders = await prisma.order.findMany({
      where: {
        ...(sellerId ? { sellerId } : {}),
        status: { in: ['DELIVERED', 'COMPLETED', 'PAID'] },
        createdAt: { gte: startDate },
      },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Get POS sales revenue by date
    const sales = await prisma.sale.findMany({
      where: {
        ...(sellerId ? { sellerId } : {}),
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const revenueMap = new Map<string, { online: number; pos: number; count: number }>();

    for (const order of orders) {
      const key = granularity === 'monthly'
        ? order.createdAt.toISOString().slice(0, 7)
        : order.createdAt.toISOString().slice(0, 10);
      const entry = revenueMap.get(key) || { online: 0, pos: 0, count: 0 };
      entry.online += order.total;
      entry.count++;
      revenueMap.set(key, entry);
    }

    for (const sale of sales) {
      const key = granularity === 'monthly'
        ? sale.createdAt.toISOString().slice(0, 7)
        : sale.createdAt.toISOString().slice(0, 10);
      const entry = revenueMap.get(key) || { online: 0, pos: 0, count: 0 };
      entry.pos += sale.total;
      entry.count++;
      revenueMap.set(key, entry);
    }

    return Array.from(revenueMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        online: Math.round(data.online),
        pos: Math.round(data.pos),
        total: Math.round(data.online + data.pos),
        count: data.count,
      }));
  } catch {
    return [];
  }
}

async function getTopSellingProducts(sellerId: string, startDate: Date) {
  // Combine order items and POS sale items
  const [orderProducts, posProducts] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        product: { sellerId },
        order: {
          status: { in: ['DELIVERED', 'COMPLETED'] },
          createdAt: { gte: startDate },
        },
      },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { sellerId, status: 'COMPLETED', createdAt: { gte: startDate } },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
  ]);

  // Merge and deduplicate
  const productMap = new Map<string, { quantitySold: number; revenue: number }>();

  for (const item of orderProducts) {
    const existing = productMap.get(item.productId) || { quantitySold: 0, revenue: 0 };
    existing.quantitySold += item._sum.quantity || 0;
    existing.revenue += item._sum.price || 0;
    productMap.set(item.productId, existing);
  }

  for (const item of posProducts) {
    const existing = productMap.get(item.productId) || { quantitySold: 0, revenue: 0 };
    existing.quantitySold += item._sum.quantity || 0;
    existing.revenue += item._sum.total || 0;
    productMap.set(item.productId, existing);
  }

  // Get product details
  const productIds = Array.from(productMap.keys());
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, price: true, images: true },
  });

  return products
    .map((p) => {
      const stats = productMap.get(p.id)!;
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0] || null,
        quantitySold: stats.quantitySold,
        revenue: Math.round(stats.revenue),
      };
    })
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 10);
}

async function getTopSellers(startDate: Date) {
  const sellers = await prisma.user.findMany({
    where: {
      role: { in: ['SELLER', 'COMPANY'] },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      sellerOrders: {
        where: {
          status: { in: ['DELIVERED', 'COMPLETED'] },
          createdAt: { gte: startDate },
        },
        select: { total: true },
      },
      sales: {
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        select: { total: true },
      },
      sellerCommission: {
        select: { rate: true, totalCommission: true },
      },
    },
  });

  return sellers
    .map((seller) => {
      const orderRevenue = seller.sellerOrders.reduce((sum, o) => sum + o.total, 0);
      const posRevenue = seller.sales.reduce((sum, s) => sum + s.total, 0);
      const totalRevenue = orderRevenue + posRevenue;

      return {
        id: seller.id,
        name: seller.name,
        avatar: seller.avatar,
        totalRevenue: Math.round(totalRevenue),
        orderCount: seller.sellerOrders.length + seller.sales.length,
        commissionRate: seller.sellerCommission?.rate || 5,
        commissionEarned: seller.sellerCommission?.totalCommission || Math.round(totalRevenue * 0.05),
      };
    })
    .filter((s) => s.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
}

async function getTopProductsAllSellers(startDate: Date) {
  const [orderProducts, posProducts] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: { in: ['DELIVERED', 'COMPLETED'] },
          createdAt: { gte: startDate },
        },
      },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { status: 'COMPLETED', createdAt: { gte: startDate } },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
  ]);

  const productMap = new Map<string, { quantitySold: number; revenue: number }>();

  for (const item of orderProducts) {
    const existing = productMap.get(item.productId) || { quantitySold: 0, revenue: 0 };
    existing.quantitySold += item._sum.quantity || 0;
    existing.revenue += item._sum.price || 0;
    productMap.set(item.productId, existing);
  }

  for (const item of posProducts) {
    const existing = productMap.get(item.productId) || { quantitySold: 0, revenue: 0 };
    existing.quantitySold += item._sum.quantity || 0;
    existing.revenue += item._sum.total || 0;
    productMap.set(item.productId, existing);
  }

  const productIds = Array.from(productMap.keys());
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, price: true, seller: { select: { name: true } } },
  });

  return products
    .map((p) => {
      const stats = productMap.get(p.id)!;
      return {
        id: p.id,
        name: p.name,
        sellerName: p.seller.name,
        quantitySold: stats.quantitySold,
        revenue: Math.round(stats.revenue),
      };
    })
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 10);
}
