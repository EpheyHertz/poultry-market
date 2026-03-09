/**
 * POS System Utilities
 * Receipt number generation, cart management, and payment helpers
 */

import { prisma } from '@/lib/prisma';

/**
 * Generate a unique receipt number for POS sales
 * Format: POS-YYYYMMDD-NNNN (e.g., POS-20260301-0001)
 */
export async function generateReceiptNumber(sellerId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `POS-${dateStr}`;

  // Count today's sales by this seller to get the next number
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const todaySaleCount = await prisma.sale.count({
    where: {
      sellerId,
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  const sequenceNumber = String(todaySaleCount + 1).padStart(4, '0');
  return `${prefix}-${sequenceNumber}`;
}

/**
 * POS Cart Item (in-memory, not persisted)
 */
export interface POSCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  image?: string;
  discount: number;
}

/**
 * Calculate totals from POS cart items
 */
export function calculatePOSCartTotals(items: POSCartItem[]) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const totalDiscount = items.reduce((sum, item) => {
    return sum + item.discount;
  }, 0);

  const total = subtotal - totalDiscount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(totalDiscount * 100) / 100,
    total: Math.round(total * 100) / 100,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/**
 * Validate POS sale items against current stock
 */
export async function validatePOSStock(
  items: Array<{ productId: string; quantity: number }>,
  sellerId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: {
        id: item.productId,
        sellerId,
        isActive: true,
      },
    });

    if (!product) {
      errors.push(`Product ${item.productId} not found or doesn't belong to you`);
      continue;
    }

    if (product.stock < item.quantity) {
      errors.push(`Insufficient stock for "${product.name}": available ${product.stock}, requested ${item.quantity}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format currency with multi-currency support
 */
export function formatPOSCurrency(amount: number, currency: string = 'KES'): string {
  const currencyConfig: Record<string, { locale: string; code: string }> = {
    KES: { locale: 'en-KE', code: 'KES' },
    USD: { locale: 'en-US', code: 'USD' },
    UGX: { locale: 'en-UG', code: 'UGX' },
    TZS: { locale: 'en-TZ', code: 'TZS' },
    NGN: { locale: 'en-NG', code: 'NGN' },
  };

  const config = currencyConfig[currency] || currencyConfig.KES;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
