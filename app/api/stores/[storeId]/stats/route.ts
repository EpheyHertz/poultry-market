import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
//   { params }: { params: { storeId: string } }
) {
  try {
     const storeId  = request.nextUrl.pathname.split('/').pop() || '';

    // Verify the store exists
    const storeOwner = await prisma.user.findFirst({
      where: {
        id: storeId,
        role: {
          in: ['SELLER', 'COMPANY']
        },
        isActive: true
      }
    });

    if (!storeOwner) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Get detailed statistics
    const [
      productsCount,
      followersCount,
      totalReviews,
      averageRatingData,
      totalOrdersData,
      monthlyStats
    ] = await Promise.all([
      // Total products
      prisma.product.count({
        where: {
          sellerId: storeId,
          isActive: true
        }
      }),

      // Total followers
      prisma.follow.count({
        where: {
          followingId: storeId
        }
      }),

      // Total reviews across all products
      prisma.review.count({
        where: {
          product: {
            sellerId: storeId
          },
          isVisible: true
        }
      }),

      // Average rating
      prisma.review.aggregate({
        where: {
          product: {
            sellerId: storeId
          },
          isVisible: true
        },
        _avg: {
          rating: true
        }
      }),

      // Total orders
      prisma.orderItem.aggregate({
        where: {
          product: {
            sellerId: storeId
          }
        },
        _count: {
          id: true
        },
        _sum: {
          quantity: true
        }
      }),

      // Monthly statistics (last 12 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', o."createdAt") as month,
          COUNT(DISTINCT o.id) as orders,
          COUNT(oi.id) as items_sold,
          SUM(oi.quantity * oi.price) as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi."orderId"
        JOIN products p ON oi."productId" = p.id
        WHERE p."sellerId" = ${storeId}
          AND o."createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', o."createdAt")
        ORDER BY month DESC
      `
    ]);

    const stats = {
      totalProducts: productsCount,
      totalFollowers: followersCount,
      totalReviews,
      averageRating: averageRatingData._avg.rating || 0,
      totalOrders: totalOrdersData._count.id || 0,
      totalItemsSold: totalOrdersData._sum.quantity || 0,
      monthlyStats,
      joinedAt: storeOwner.createdAt
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching store statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store statistics' },
      { status: 500 }
    );
  }
}
