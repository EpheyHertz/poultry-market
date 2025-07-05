
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if user already liked this product
    const existingLike = await prisma.productLike.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId: id
        }
      }
    });

    if (existingLike) {
      // Remove like
      await prisma.productLike.delete({
        where: {
          userId_productId: {
            userId: user.id,
            productId: id
          }
        }
      });
      return NextResponse.json({ liked: false });
    } else {
      // Add like
      await prisma.productLike.create({
        data: {
          userId: user.id,
          productId: id
        }
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error('Error toggling product like:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
