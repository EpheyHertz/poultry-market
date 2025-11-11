import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

/**
 * GET /api/customer/orders
 * Get customer's orders
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {
      customerId: user.id,
    };
    
    if (status) {
      where.status = status as OrderStatus;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: {
                  seller: {
                    select: {
                      id: true,
                      name: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
          payment: true,
          delivery: {
            include: {
              agent: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
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

    // Get statistics
    const stats = await prisma.order.groupBy({
      by: ['status'],
      where: { customerId: user.id },
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
    console.error('Customer orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
