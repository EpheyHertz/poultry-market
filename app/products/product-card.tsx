'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Heart, ImageOff, Plus, ShoppingCart, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn, formatProductTypeLabel } from '@/lib/utils';

import {
    DEFAULT_TAG_TONE,
    brandButtonClass,
    calculateDiscountMeta,
    formatPrice,
    formatTagLabel,
    tagIcons,
    tagToneClasses,
} from './product-helpers';

type ProductCardProps = {
    product: any;
    view?: 'grid' | 'list';
    isAuthenticated: boolean;
    isFavorite: boolean;
    cartQuantity: number;
    onAddToCart: (productId: string, quantity?: number) => void;
    onToggleFavorite: (productId: string) => void;
};

export default function ProductCard({
    product,
    view = 'grid',
    isAuthenticated,
    isFavorite,
    cartQuantity,
    onAddToCart,
    onToggleFavorite,
}: ProductCardProps) {
    const [imageFailed, setImageFailed] = useState(false);

    const { original: originalPrice, current: displayPrice, discountPercent, savings, showDiscount } =
        calculateDiscountMeta(product);

    const stock = Number(product.stock ?? 0);
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 5;
    const imageSrc = !imageFailed && Array.isArray(product.images) ? product.images[0] : null;
    const typeLabel = formatProductTypeLabel(product.type, product.customType);
    const isList = view === 'list';

    /** Only render a unit suffix when the listing actually provides one. */
    const unitLabel = typeof product.unit === 'string' && product.unit.trim().length > 0 ? product.unit.trim() : null;
    const sellerName = typeof product.seller?.name === 'string' ? product.seller.name : null;
    const sellerIsVerified =
        Array.isArray(product.seller?.tags) && product.seller.tags.some((entry: any) => entry?.tag === 'VERIFIED');
    const reviewCount = Number(product.reviewCount ?? 0);
    const visibleTags = Array.isArray(product.tags) ? product.tags.slice(0, isList ? 3 : 2) : [];

    const stockTone = isOutOfStock
        ? 'text-rose-600 dark:text-rose-400'
        : isLowStock
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-muted-foreground';
    const stockLabel = isOutOfStock ? 'Out of stock' : isLowStock ? `Only ${stock} left` : 'In stock';

    /* ---------------------------------------------------------------- price */
    const priceBlock = (
        <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-lg font-bold tabular-nums tracking-tight text-foreground">
                    {formatPrice(displayPrice)}
                </span>
                {showDiscount && originalPrice && (
                    <span className="text-xs tabular-nums text-muted-foreground line-through">
                        {formatPrice(originalPrice)}
                    </span>
                )}
                {unitLabel && <span className="text-xs text-muted-foreground">/ {unitLabel}</span>}
            </div>
            {showDiscount && savings > 0 && (
                <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Save {formatPrice(savings)}
                </p>
            )}
        </div>
    );

    /* ------------------------------------------------------------------- cta */
    const actionBlock = (
        <div className="relative z-20">
            {!isAuthenticated ? (
                <Button asChild variant="outline" className="h-10 w-full text-sm font-semibold">
                    <Link href="/auth/login">
                        <ShoppingCart className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">Sign in to buy</span>
                    </Link>
                </Button>
            ) : cartQuantity > 0 ? (
                <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 pl-3 pr-1 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{cartQuantity} in cart</span>
                    </span>
                    <Button
                        type="button"
                        size="icon"
                        aria-label={`Add another ${product.name} to cart`}
                        onClick={() => onAddToCart(product.id, 1)}
                        disabled={isOutOfStock}
                        className={cn('h-8 w-8 shrink-0', brandButtonClass)}
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
            ) : (
                <Button
                    type="button"
                    onClick={() => onAddToCart(product.id, 1)}
                    disabled={isOutOfStock}
                    aria-label={`Add ${product.name} to cart`}
                    className={cn('h-10 w-full text-sm font-semibold', brandButtonClass)}
                >
                    <ShoppingCart className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{isOutOfStock ? 'Out of stock' : 'Add to cart'}</span>
                </Button>
            )}
        </div>
    );

    /* ------------------------------------------------------------------ meta */
    const metaLine = (
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
            {sellerName && (
                <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                    <span className="truncate">{sellerName}</span>
                    {sellerIsVerified && (
                        <BadgeCheck
                            className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                            aria-label="Verified seller"
                        />
                    )}
                </span>
            )}
            {sellerName && <span className="text-border" aria-hidden="true">•</span>}
            <span className={cn('shrink-0 font-medium', stockTone)}>{stockLabel}</span>
        </div>
    );

    return (
        <Card
            className={cn(
                'group relative flex h-full overflow-hidden rounded-xl border-border bg-card shadow-sm transition-all duration-200',
                'hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg motion-reduce:hover:translate-y-0 dark:hover:border-emerald-500/40',
                'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
                isList ? 'flex-row' : 'flex-col'
            )}
        >
            {/* Whole-card link. Interactive controls sit above it via z-20. */}
            <Link
                href={`/product/${product.id}`}
                className="absolute inset-0 z-10 rounded-xl focus:outline-none"
                aria-label={`View ${product.name}`}
            >
                <span className="sr-only">View {product.name}</span>
            </Link>

            {/* Media */}
            <div
                className={cn(
                    'relative shrink-0 overflow-hidden bg-muted',
                    isList ? 'aspect-square w-28 sm:w-44 md:w-52' : 'aspect-square w-full'
                )}
            >
                {imageSrc ? (
                    <Image
                        src={imageSrc}
                        alt={product.name}
                        fill
                        sizes={isList ? '(max-width: 768px) 30vw, 208px' : '(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 280px'}
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transform-none"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                        <ImageOff className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden="true" />
                        <span className="text-[11px] font-medium">No image</span>
                    </div>
                )}

                {showDiscount && (
                    <span className="absolute left-2 top-2 z-20 rounded-md bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                        -{discountPercent}%
                    </span>
                )}

                {isOutOfStock && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
                        <span className="rounded-md bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
                            Out of stock
                        </span>
                    </div>
                )}

                {/* Stays visible on touch devices and whenever it is active or focused. */}
                <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    aria-label={isFavorite ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`}
                    aria-pressed={isFavorite}
                    onClick={() => onToggleFavorite(product.id)}
                    className={cn(
                        'absolute right-2 top-2 z-20 h-9 w-9 rounded-full bg-card/90 shadow-sm backdrop-blur transition-opacity hover:bg-card',
                        'focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
                        isFavorite && 'lg:opacity-100'
                    )}
                >
                    <Heart
                        className={cn('h-4 w-4', isFavorite ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground')}
                        aria-hidden="true"
                    />
                </Button>
            </div>

            {/* Body */}
            <div
                className={cn(
                    'flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4',
                    isList && 'md:flex-row md:items-stretch md:gap-5'
                )}
            >
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        {typeLabel ? (
                            <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {typeLabel}
                            </span>
                        ) : (
                            <span />
                        )}
                        {reviewCount > 0 && (
                            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-foreground">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                                {(product.averageRating || 0).toFixed(1)}
                                <span className="font-normal text-muted-foreground">({reviewCount})</span>
                            </span>
                        )}
                    </div>

                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400 sm:text-[15px]">
                        {product.name}
                    </h3>

                    {isList && product.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                    )}

                    {visibleTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {visibleTags.map((tagData: any) => {
                                const TagIcon = tagIcons[tagData.tag] ?? Star;
                                return (
                                    <span
                                        key={tagData.tag}
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                                            tagToneClasses[tagData.tag] ?? DEFAULT_TAG_TONE
                                        )}
                                    >
                                        <TagIcon className="h-3 w-3" aria-hidden="true" />
                                        {formatTagLabel(tagData.tag)}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* In list view the meta line belongs with the content column. */}
                    {isList && <div className="mt-3">{metaLine}</div>}
                </div>

                {/* Purchase rail: inline on grid cards, a dedicated column on wide list rows. */}
                <div
                    className={cn(
                        'flex flex-col gap-2',
                        isList
                            ? 'md:w-48 md:shrink-0 md:justify-between md:border-l md:border-border md:pl-5'
                            : 'mt-auto'
                    )}
                >
                    {priceBlock}
                    {!isList && metaLine}
                    {actionBlock}
                </div>
            </div>
        </Card>
    );
}

/** Skeleton mirrors the real card so the grid does not shift when data arrives. */
export function ProductCardSkeleton({ view = 'grid' }: { view?: 'grid' | 'list' }) {
    const isList = view === 'list';

    return (
        <Card
            className={cn(
                'flex h-full animate-pulse overflow-hidden rounded-xl border-border bg-card',
                isList ? 'flex-row' : 'flex-col'
            )}
            aria-hidden="true"
        >
            <div className={cn('shrink-0 bg-muted', isList ? 'aspect-square w-28 sm:w-44 md:w-52' : 'aspect-square w-full')} />
            <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="h-4 w-4/5 rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="mt-auto space-y-2 pt-2">
                    <div className="h-5 w-1/2 rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                    <div className="h-10 w-full rounded bg-muted" />
                </div>
            </div>
        </Card>
    );
}
