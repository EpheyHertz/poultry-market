import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { getOrderTimeline } from '@/lib/order-timeline';

/**
 * GET /api/seller/orders
 * Get seller's orders
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'SELLER' && user.role !== 'COMPANY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {
      items: {
        some: {
          product: {
            sellerId: user.id,
          },
        },
      },
    };
    
    if (status) {
      where.status = status as OrderStatus;
    }
    
    if (paymentStatus) {
      where.paymentStatus = paymentStatus as PaymentStatus;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          items: {
            where: {
              product: {
                sellerId: user.id,
              },
            },
            include: {
              product: true,
            },
          },
          payment: true,
          delivery: true,
          timeline: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Get statistics for seller's orders
    const stats = await prisma.order.groupBy({
      by: ['status'],
      where: {
        items: {
          some: {
            product: {
              sellerId: user.id,
            },
          },
        },
      },
      _count: { id: true },
    });

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: stats.reduce((acc, { status, _count }) => {
        acc[status] = _count.id;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Seller orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
