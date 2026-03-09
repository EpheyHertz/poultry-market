/**
 * Store Service — business logic for multi-tenant store operations
 */

import { prisma } from '@/lib/prisma';
import type { StoreType, StoreStatus, EscrowStatus } from '@prisma/client';

// ═══════════════════════════════════════
// STORE CRUD
// ═══════════════════════════════════════

export async function createStore(input: {
  ownerId: string;
  storeName: string;
  storeSlug: string;
  storeDescription?: string;
  logo?: string;
  bannerImage?: string;
  location?: string;
  contactPhone?: string;
  socialLinks?: Record<string, string>;
  themeColor?: string;
  storeType: StoreType;
}) {
  const existing = await prisma.store.findUnique({ where: { storeSlug: input.storeSlug } });
  if (existing) throw new Error('Store slug already taken');

  const ownerHasStore = await prisma.store.findUnique({ where: { ownerId: input.ownerId } });
  if (ownerHasStore) throw new Error('User already owns a store');

  const store = await prisma.store.create({
    data: {
      ownerId: input.ownerId,
      storeName: input.storeName,
      storeSlug: input.storeSlug,
      storeDescription: input.storeDescription,
      logo: input.logo,
      bannerImage: input.bannerImage,
      location: input.location,
      contactPhone: input.contactPhone,
      socialLinks: input.socialLinks ? JSON.stringify(input.socialLinks) : null,
      themeColor: input.themeColor || '#16a34a',
      storeType: input.storeType,
      storeWallet: {
        create: {}, // init wallet with defaults
      },
    },
    include: { storeWallet: true },
  });

  return store;
}

export async function getStoreBySlug(slug: string) {
  return prisma.store.findUnique({
    where: { storeSlug: slug },
    include: {
      owner: {
        select: {
          id: true, name: true, email: true, avatar: true,
          bio: true, location: true, phone: true, tags: true,
          offersDelivery: true, offersFreeDelivery: true,
          deliveryProvinces: true, deliveryCounties: true,
        },
      },
      storeWallet: { select: { availableBalance: true, totalEarned: true } },
      _count: { select: { products: true, orders: true } },
    },
  });
}

export async function getStoreByOwner(ownerId: string) {
  return prisma.store.findUnique({
    where: { ownerId },
    include: {
      storeWallet: true,
      _count: { select: { products: true, orders: true, withdrawals: true } },
    },
  });
}

export async function updateStore(storeId: string, ownerId: string, data: {
  storeName?: string;
  storeDescription?: string;
  logo?: string;
  bannerImage?: string;
  location?: string;
  contactPhone?: string;
  socialLinks?: Record<string, string>;
  themeColor?: string;
}) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || store.ownerId !== ownerId) throw new Error('Unauthorized');

  return prisma.store.update({
    where: { id: storeId },
    data: {
      ...data,
      socialLinks: data.socialLinks ? JSON.stringify(data.socialLinks) : undefined,
    },
  });
}

export async function listStores(options: {
  page?: number;
  limit?: number;
  search?: string;
  storeType?: StoreType;
  status?: StoreStatus;
} = {}) {
  const { page = 1, limit = 20, search, storeType, status } = options;

  const where: any = { status: status || 'ACTIVE' };
  if (storeType) where.storeType = storeType;
  if (search) {
    where.OR = [
      { storeName: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        _count: { select: { products: true } },
      },
      orderBy: { totalRevenue: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.store.count({ where }),
  ]);

  return { stores, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ═══════════════════════════════════════
// STORE WALLET & ESCROW
// ═══════════════════════════════════════

/**
 * Hold payment in escrow for an order.
 */
export async function holdInEscrow(orderId: string, storeId: string, amount: number) {
  const wallet = await prisma.storeWallet.findUnique({ where: { storeId } });
  if (!wallet) throw new Error('Store wallet not found');

  await prisma.$transaction([
    prisma.storeWallet.update({
      where: { storeId },
      data: { escrowBalance: { increment: amount } },
    }),
    prisma.storeWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'ESCROW_HOLD',
        amount,
        fee: 0,
        netAmount: amount,
        narrative: `Escrow hold for order ${orderId.slice(-8)}`,
        orderId,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { escrowStatus: 'HELD', escrowAmount: amount },
    }),
  ]);
}

/**
 * Release escrow to seller after admin approves delivery proof.
 */
export async function releaseEscrow(orderId: string, commissionRate = 5) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { store: { include: { storeWallet: true } } },
  });
  if (!order || !order.store?.storeWallet) throw new Error('Order or store wallet not found');
  if (order.escrowStatus !== 'DELIVERY_PROOF_SUBMITTED') throw new Error('Delivery proof not submitted');

  const amount = order.escrowAmount || order.total;
  const commission = Math.round(amount * (commissionRate / 100) * 100) / 100;
  const netAmount = Math.round((amount - commission) * 100) / 100;
  const wallet = order.store.storeWallet;

  await prisma.$transaction([
    prisma.storeWallet.update({
      where: { id: wallet.id },
      data: {
        escrowBalance: { decrement: amount },
        availableBalance: { increment: netAmount },
        totalEarned: { increment: netAmount },
      },
    }),
    prisma.storeWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'ESCROW_RELEASE',
        amount,
        fee: commission,
        netAmount,
        narrative: `Escrow release for order ${orderId.slice(-8)} (${commissionRate}% commission)`,
        orderId,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        escrowStatus: 'RELEASED',
        escrowReleasedAt: new Date(),
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    }),
  ]);
}

// ═══════════════════════════════════════
// STORE DASHBOARD METRICS
// ═══════════════════════════════════════

export async function getStoreDashboard(storeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [store, todayOrders, weekOrders, monthOrders, topProducts, lowStock, recentOrders] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      include: { storeWallet: true },
    }),
    prisma.order.count({ where: { storeId, createdAt: { gte: today }, status: { not: 'CANCELLED' } } }),
    prisma.order.aggregate({
      where: { storeId, createdAt: { gte: weekAgo }, status: { in: ['PAID', 'APPROVED', 'COMPLETED'] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { storeId, createdAt: { gte: monthAgo }, status: { in: ['PAID', 'APPROVED', 'COMPLETED'] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { storeId, createdAt: { gte: monthAgo } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.product.findMany({
      where: { storeId, isActive: true, stock: { lte: 10 } },
      select: { id: true, name: true, stock: true, images: true },
      take: 10,
    }),
    prisma.order.findMany({
      where: { storeId },
      include: { customer: { select: { name: true } }, items: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Resolve top product names
  const topProductIds = topProducts.map((p) => p.productId);
  const productNames = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true },
  });
  const nameMap = Object.fromEntries(productNames.map((p) => [p.id, p.name]));

  return {
    store,
    metrics: {
      todayOrders,
      weekRevenue: weekOrders._sum.total || 0,
      weekOrderCount: weekOrders._count,
      monthRevenue: monthOrders._sum.total || 0,
      monthOrderCount: monthOrders._count,
    },
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      productName: nameMap[p.productId] || 'Unknown',
      quantitySold: p._sum.quantity || 0,
    })),
    lowStock,
    recentOrders,
  };
}

// ═══════════════════════════════════════
// STORE PRODUCTS (tenant-scoped)
// ═══════════════════════════════════════

export async function getStoreProducts(storeId: string, options: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
} = {}) {
  const { page = 1, limit = 20, search, category } = options;

  const where: any = { storeId, isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) {
    where.categories = { some: { category: { slug: category } } };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        reviews: { select: { rating: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ═══════════════════════════════════════
// SYNC STATS HELPER
// ═══════════════════════════════════════

export async function syncStoreStats(storeId: string) {
  const [productCount, orderCount, revenueAgg, reviewAgg] = await Promise.all([
    prisma.product.count({ where: { storeId, isActive: true } }),
    prisma.order.count({ where: { storeId, status: { not: 'CANCELLED' } } }),
    prisma.order.aggregate({
      where: { storeId, status: 'COMPLETED' },
      _sum: { total: true },
    }),
    prisma.review.aggregate({
      where: { product: { storeId } },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  await prisma.store.update({
    where: { id: storeId },
    data: {
      totalProducts: productCount,
      totalOrders: orderCount,
      totalRevenue: revenueAgg._sum.total || 0,
      averageRating: reviewAgg._avg.rating || 0,
      totalReviews: reviewAgg._count,
    },
  });
}
