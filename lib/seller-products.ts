/**
 * Shared seller/company product-management constants and helpers.
 *
 * Kept free of server-only imports so the same source of truth can be used by
 * API routes, server components and client components.
 */

/** Stock at or below this value (but above zero) is treated as "low stock". */
export const LOW_STOCK_THRESHOLD = 10;

/** Image limits mirrored from the existing product create/edit flows. */
export const MAX_PRODUCT_IMAGES = 5;
export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export type ProductTypeOption = { value: string; label: string };

/** Product types a SELLER is allowed to list (matches /api/products validation). */
export const SELLER_PRODUCT_TYPES: ProductTypeOption[] = [
    { value: 'EGGS', label: 'Eggs' },
    { value: 'CHICKEN_MEAT', label: 'Chicken Meat' },
    { value: 'CUSTOM', label: 'Custom type' },
];

/** Product types a COMPANY is allowed to list (matches /api/products validation). */
export const COMPANY_PRODUCT_TYPES: ProductTypeOption[] = [
    { value: 'CHICKEN_FEED', label: 'Chicken Feed' },
    { value: 'CHICKS', label: 'Chicks' },
    { value: 'HATCHING_EGGS', label: 'Hatching Eggs' },
    { value: 'CUSTOM', label: 'Custom type' },
];

export function getProductTypeOptions(role?: string | null): ProductTypeOption[] {
    return role === 'COMPANY' ? COMPANY_PRODUCT_TYPES : SELLER_PRODUCT_TYPES;
}

export type StockStatusKey = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';

export type StockStatus = {
    key: StockStatusKey;
    label: string;
    /** Badge classes that stay readable in both light and dark mode. */
    className: string;
};

export function getStockStatus(stock: number): StockStatus {
    if (!Number.isFinite(stock) || stock <= 0) {
        return {
            key: 'OUT_OF_STOCK',
            label: 'Out of stock',
            className:
                'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
        };
    }

    if (stock <= LOW_STOCK_THRESHOLD) {
        return {
            key: 'LOW_STOCK',
            label: 'Low stock',
            className:
                'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
        };
    }

    return {
        key: 'IN_STOCK',
        label: 'In stock',
        className:
            'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    };
}

/** Publication state badge (uses the existing `isActive` column). */
export function getPublishStatus(isActive: boolean) {
    return isActive
        ? {
            label: 'Published',
            className:
                'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
        }
        : {
            label: 'Archived',
            className:
                'border-border bg-muted text-muted-foreground',
        };
}

/**
 * Product ids are cuids. Validate the shape before touching the database so
 * malformed/injected identifiers are rejected with a 400 instead of a 500.
 */
export function isValidProductId(id: unknown): id is string {
    return typeof id === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(id);
}

/**
 * Statuses that still need attention (i.e. not finished and not cancelled).
 * Mirrors the OrderStatus enum in prisma/schema.prisma.
 */
export const OPEN_ORDER_STATUSES = [
    'PENDING',
    'PAYMENT_PENDING',
    'PAID',
    'APPROVED',
    'PACKED',
    'READY_FOR_DELIVERY',
    'IN_TRANSIT',
    'REACHED_COLLECTION_POINT',
    'READY_FOR_PICKUP',
] as const;

/** Order status badge classes that stay readable in both light and dark mode. */
export function getOrderStatusClassName(status: string): string {
    switch (status) {
        case 'PENDING':
        case 'PAYMENT_PENDING':
            return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300';
        case 'PAID':
        case 'APPROVED':
        case 'PACKED':
        case 'READY_FOR_DELIVERY':
            return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300';
        case 'IN_TRANSIT':
        case 'REACHED_COLLECTION_POINT':
        case 'READY_FOR_PICKUP':
            return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300';
        case 'DELIVERED':
        case 'COMPLETED':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300';
        case 'CANCELLED':
        case 'REJECTED':
            return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300';
        default:
            return 'border-border bg-muted text-muted-foreground';
    }
}

/** Turns `OUT_FOR_DELIVERY` into `Out for delivery`. */
export function formatStatusLabel(status: string): string {
    const normalized = status.replace(/_/g, ' ').toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
