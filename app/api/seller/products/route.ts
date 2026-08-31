import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { LOW_STOCK_THRESHOLD } from '@/lib/seller-products';
import { Prisma, ProductType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

/**
 * Catalogue listing scoped to the signed-in seller/company.
 *
 * The seller id always comes from the session — never from the query string —
 * so one account can never page through another account's catalogue.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'You need to sign in to view your products.' }, { status: 401 });
        }

        if (user.role !== 'SELLER' && user.role !== 'COMPANY') {
            return NextResponse.json(
                { error: 'Your account does not have a product catalogue.' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const search = (searchParams.get('search') || '').trim();
        const type = searchParams.get('type') || '';
        const status = searchParams.get('status') || '';
        const stock = searchParams.get('stock') || '';
        const sort = searchParams.get('sort') || 'newest';
        const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);

        const where: Prisma.ProductWhereInput = { sellerId: user.id };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (type && type !== 'ALL') {
            where.type = type as ProductType;
        }

        if (status === 'ACTIVE') {
            where.isActive = true;
        } else if (status === 'ARCHIVED') {
            where.isActive = false;
        }

        if (stock === 'OUT_OF_STOCK') {
            where.stock = { lte: 0 };
        } else if (stock === 'LOW_STOCK') {
            where.stock = { gt: 0, lte: LOW_STOCK_THRESHOLD };
        } else if (stock === 'IN_STOCK') {
            where.stock = { gt: LOW_STOCK_THRESHOLD };
        }

        const orderBy: Prisma.ProductOrderByWithRelationInput =
            sort === 'oldest'
                ? { createdAt: 'asc' }
                : sort === 'name'
                    ? { name: 'asc' }
                    : sort === 'price-asc'
                        ? { price: 'asc' }
                        : sort === 'price-desc'
                            ? { price: 'desc' }
                            : sort === 'stock-asc'
                                ? { stock: 'asc' }
                                : { createdAt: 'desc' };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                orderBy,
                skip: (page - 1) * PAGE_SIZE,
                take: PAGE_SIZE,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    stock: true,
                    type: true,
                    customType: true,
                    images: true,
                    isActive: true,
                    slug: true,
                    sku: true,
                    unitType: true,
                    hasDiscount: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: { select: { orderItems: true, reviews: true } },
                },
            }),
            prisma.product.count({ where }),
        ]);

        return NextResponse.json({
            products,
            pagination: {
                page,
                limit: PAGE_SIZE,
                total,
                pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            },
        });
    } catch (error) {
        console.error('Seller products fetch error:', error);
        return NextResponse.json(
            { error: 'We could not load your products. Please try again.' },
            { status: 500 }
        );
    }
}
