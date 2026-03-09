import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for inventory adjustments
const adjustmentSchema = z.object({
  productId: z.string().min(1),
  action: z.enum(['RESTOCK', 'ADJUSTMENT', 'DAMAGE', 'TRANSFER']),
  quantity: z.number().int(), // Positive for additions, negative for deductions
  reason: z.string().min(1, 'Reason is required'),
});

/**
 * GET /api/pos/inventory
 * Get inventory logs for a seller's products
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId') || undefined;
    const action = searchParams.get('action') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      ...(user.role !== 'ADMIN' && { userId: user.id }),
      ...(productId && { productId }),
      ...(action && { action: action as any }),
    };

    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        include: {
          product: { select: { name: true, stock: true, images: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[POS Inventory GET]', error);
    return NextResponse.json({ error: 'Failed to fetch inventory logs' }, { status: 500 });
  }
}

/**
 * POST /api/pos/inventory
 * Create a manual inventory adjustment (restock, damage, adjustment, transfer)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, action, quantity, reason } = parsed.data;

    // Verify product belongs to seller
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        ...(user.role !== 'ADMIN' && { sellerId: user.id }),
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const newStock = product.stock + quantity;
    if (newStock < 0) {
      return NextResponse.json(
        { error: `Insufficient stock. Current: ${product.stock}, Adjustment: ${quantity}` },
        { status: 400 }
      );
    }

    // Update stock and create log in a transaction
    const [updatedProduct, log] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock },
      }),
      prisma.inventoryLog.create({
        data: {
          productId,
          userId: user.id,
          action,
          quantity,
          previousStock: product.stock,
          newStock,
          reason,
        },
      }),
    ]);

    return NextResponse.json({
      log,
      product: { id: updatedProduct.id, name: updatedProduct.name, stock: updatedProduct.stock },
    }, { status: 201 });
  } catch (error) {
    console.error('[POS Inventory POST]', error);
    return NextResponse.json({ error: 'Failed to create inventory adjustment' }, { status: 500 });
  }
}
