import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { logPaymentConfirmed, getOrderTimeline } from '@/lib/order-timeline';
import { createNotification, notificationTemplates } from '@/lib/notifications';

/**
 * GET /api/admin/orders
 * Get all orders with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const searchTerm = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (status) {
      where.status = status as OrderStatus;
    }
    
    if (paymentStatus) {
      where.paymentStatus = paymentStatus as PaymentStatus;
    }

    if (searchTerm) {
      where.OR = [
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { customer: { email: { contains: searchTerm, mode: 'insensitive' } } },
      ];
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
            include: {
              product: {
                include: {
                  seller: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
          payment: true,
          delivery: true,
          paymentApprovals: {
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          timeline: {
            orderBy: { createdAt: 'desc' },
            take: 5, // Get last 5 timeline events
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
      _count: { id: true },
    });

    const paymentStats = await prisma.order.groupBy({
      by: ['paymentStatus'],
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
      stats: {
        byStatus: stats.reduce((acc, { status, _count }) => {
          acc[status] = _count.id;
          return acc;
        }, {} as Record<string, number>),
        byPaymentStatus: paymentStats.reduce((acc, { paymentStatus, _count }) => {
          acc[paymentStatus] = _count.id;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Admin orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

/**
 * GET /api/admin/orders/[id]
 * Get single order with full details and timeline
 */
export async function getOrderById(orderId: string, adminId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
          include: {
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
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
                email: true,
                phone: true,
              },
            },
          },
        },
        paymentApprovals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        timeline: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return null;
    }

    return order;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}
