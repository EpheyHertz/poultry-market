import {
    AlertTriangle,
    Award,
    Crown,
    Leaf,
    MapPin,
    Percent,
    Shield,
    Star,
    TrendingUp,
    Zap,
    type LucideIcon,
} from 'lucide-react';

export type FilterOption = {
    value: string;
    label: string;
    count: number;
};

export type TypeFilterOption = {
    id: string;
    type: string;
    customType: string | null;
    label: string;
    count: number;
};

/** Shared brand action styling so primary CTAs read the same in both themes. */
export const brandButtonClass =
    'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400';

export const tagIcons: Record<string, LucideIcon> = {
    VERIFIED: Shield,
    TRUSTED: Star,
    RECOMMENDED: Award,
    PREMIUM: Crown,
    FEATURED: Crown,
    ORGANIC: Leaf,
    LOCAL: MapPin,
    BESTSELLER: TrendingUp,
    TRENDING: TrendingUp,
    DISCOUNTED: Percent,
    DISCOUNT: Percent,
    NEW_ARRIVAL: Zap,
    NEW: Zap,
    LIMITED_STOCK: AlertTriangle,
};

/** Tag tones are declared per theme so nothing washes out in dark mode. */
export const tagToneClasses: Record<string, string> = {
    VERIFIED:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    TRUSTED:
        'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
    RECOMMENDED:
        'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300',
    PREMIUM:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    FEATURED:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    ORGANIC:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    LOCAL: 'border-border bg-muted text-muted-foreground',
    BESTSELLER:
        'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300',
    TRENDING:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
    DISCOUNTED:
        'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300',
    DISCOUNT:
        'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300',
    NEW_ARRIVAL:
        'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300',
    NEW: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300',
    LIMITED_STOCK:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
};

export const DEFAULT_TAG_TONE = 'border-border bg-muted text-muted-foreground';

export const formatTagLabel = (tag: string) =>
    tag
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

export const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(price);

const resolveOriginalPrice = (product: any) => {
    if (!product) return null;

    const explicitOriginal = Number(product.originalPrice);
    if (Number.isFinite(explicitOriginal) && explicitOriginal > 0) {
        return explicitOriginal;
    }

    const basePrice = Number(product.price);
    if (Number.isFinite(basePrice) && basePrice > 0) {
        return basePrice;
    }

    const derivedFromCurrent = Number(product.currentPrice);
    return Number.isFinite(derivedFromCurrent) && derivedFromCurrent > 0 ? derivedFromCurrent : null;
};

const resolveCurrentPrice = (product: any) => {
    const current = Number(product?.currentPrice);
    if (Number.isFinite(current) && current >= 0) {
        return current;
    }

    const fallback = Number(product?.price);
    return Number.isFinite(fallback) && fallback >= 0 ? fallback : 0;
};

export type DiscountMeta = {
    original: number | null;
    current: number;
    discountPercent: number;
    savings: number;
    showDiscount: boolean;
};

/** Pricing/discount maths kept identical to the previous implementation. */
export const calculateDiscountMeta = (product: any): DiscountMeta => {
    const original = resolveOriginalPrice(product);
    const current = resolveCurrentPrice(product);

    if (!product?.isDiscounted || !original || original <= current) {
        return { original, current, discountPercent: 0, savings: 0, showDiscount: false };
    }

    const explicitPercent = Number(
        product.discountPercentage ?? (product.discountType === 'PERCENTAGE' ? product.discountAmount : undefined)
    );
    const savings = Math.max(0, original - current);
    const derivedPercent = savings > 0 ? (savings / original) * 100 : 0;
    const discountPercent = Math.max(
        0,
        Math.round(Number.isFinite(explicitPercent) && explicitPercent > 0 ? explicitPercent : derivedPercent)
    );

    return {
        original,
        current,
        discountPercent,
        savings,
        showDiscount: savings > 0 && discountPercent > 0,
    };
};
