
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Find product by ID or slug
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

    // Increment view count (assuming we add a views field to the product model)
    // For now, we'll just return success
    // In a real implementation, you might want to track this in a separate analytics table

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating product views:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
