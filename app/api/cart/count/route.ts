
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cartCount = await prisma.cartItem.count({
      where: { userId: user.id }
    });

    const totalQuantity = await prisma.cartItem.aggregate({
      where: { userId: user.id },
      _sum: {
        quantity: true
      }
    });

    return NextResponse.json({ 
      count: cartCount,
      totalQuantity: totalQuantity._sum.quantity || 0
    });
  } catch (error) {
    console.error('Error fetching cart count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
