// lib/orders.ts
import { prisma } from '@/lib/prisma';

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

    return order || null;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}
