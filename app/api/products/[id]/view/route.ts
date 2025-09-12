import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest
) {
const pathParts = request.nextUrl.pathname.split('/')
const id = pathParts[pathParts.length - 2]
  try {
    // const { id } = params; // ✅ FIXED: removed unnecessary await

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: id },
          { slug: id }
        ]
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Optionally increment view count here
    // await prisma.product.update({ where: { id: product.id }, data: { views: { increment: 1 } } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating product views:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
