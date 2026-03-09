import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/pos/dashboard
 * POS dashboard metrics: today's sales, monthly revenue, top products, stock alerts
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sellerId = user.role === 'ADMIN' ? undefined : user.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    const sellerFilter = sellerId ? { sellerId } : {};

    // Run all queries in parallel
    const [
      todaySales,
      todaySalesAggregate,
      weeklySalesAggregate,
      monthlySalesAggregate,
      topProducts,
      stockAlerts,
      recentSales,
      salesByPaymentMethod,
      dailySalesChart,
    ] = await Promise.all([
      // Today's sale count
      prisma.sale.count({
        where: {
          ...sellerFilter,
          status: 'COMPLETED',
          createdAt: { gte: startOfDay },
        },
      }),

      // Today's total revenue
      prisma.sale.aggregate({
        where: {
          ...sellerFilter,
          status: 'COMPLETED',
          createdAt: { gte: startOfDay },
        },
        _sum: { total: true },
        _avg: { total: true },
      }),

      // This week's total
      prisma.sale.aggregate({
        where: {
          ...sellerFilter,
          status: 'COMPLETED',
          createdAt: { gte: startOfWeek },
        },
        _sum: { total: true },
        _count: true,
      }),

      // Monthly revenue
      prisma.sale.aggregate({
        where: {
          ...sellerFilter,
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
        _sum: { total: true },
        _count: true,
      }),

      // Top selling products (by quantity sold this month)
      prisma.saleItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          sale: {
            ...sellerFilter,
            status: 'COMPLETED',
            createdAt: { gte: startOfMonth },
          },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),

      // Stock alerts (low stock & out of stock products)
      prisma.product.findMany({
        where: {
          ...(sellerId ? { sellerId } : {}),
          isActive: true,
          stock: { lte: 10 },
        },
        select: {
          id: true,
          name: true,
          stock: true,
          price: true,
          images: true,
        },
        orderBy: { stock: 'asc' },
        take: 20,
      }),

      // Recent sales
      prisma.sale.findMany({
        where: sellerFilter,
        include: {
          items: { select: { productName: true, quantity: true, total: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Sales by payment method (this month)
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: {
          ...sellerFilter,
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
        _sum: { total: true },
        _count: true,
      }),

      // Daily sales for last 30 days (for chart) - use Prisma groupBy instead of raw SQL
      prisma.sale.findMany({
        where: {
          ...sellerFilter,
          status: 'COMPLETED',
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { total: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }).then(sales => {
        const dayMap = new Map<string, { count: number; revenue: number }>();
        for (const sale of sales) {
          const dateKey = sale.createdAt.toISOString().slice(0, 10);
          const entry = dayMap.get(dateKey) || { count: 0, revenue: 0 };
          entry.count++;
          entry.revenue += sale.total;
          dayMap.set(dateKey, entry);
        }
        return Array.from(dayMap.entries()).map(([date, data]) => ({
          date,
          count: data.count,
          revenue: data.revenue,
        }));
      }).catch(() => []),
    ]);

    return NextResponse.json({
      today: {
        salesCount: todaySales,
        revenue: todaySalesAggregate._sum.total || 0,
        averageOrderValue: todaySalesAggregate._avg.total || 0,
      },
      week: {
        salesCount: weeklySalesAggregate._count || 0,
        revenue: weeklySalesAggregate._sum.total || 0,
      },
      month: {
        salesCount: monthlySalesAggregate._count || 0,
        revenue: monthlySalesAggregate._sum.total || 0,
      },
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        quantitySold: p._sum.quantity || 0,
        revenue: p._sum.total || 0,
      })),
      stockAlerts: stockAlerts.map((p) => ({
        ...p,
        image: p.images?.[0] || null,
        alertLevel: p.stock === 0 ? 'out_of_stock' : p.stock <= 5 ? 'critical' : 'low',
      })),
      recentSales,
      salesByPaymentMethod: salesByPaymentMethod.map((s) => ({
        method: s.paymentMethod,
        count: s._count,
        total: s._sum.total || 0,
      })),
      dailySalesChart: dailySalesChart,
    });
  } catch (error) {
    console.error('[POS Dashboard GET]', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}
