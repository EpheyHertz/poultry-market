'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    AlertCircle,
    ArrowUpDown,
    Edit,
    Eye,
    Loader2,
    MoreHorizontal,
    Package,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatProductTypeLabel } from '@/lib/utils';
import {
    getProductTypeOptions,
    getPublishStatus,
    getStockStatus,
} from '@/lib/seller-products';

export type SellerProduct = {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    type: string;
    customType: string | null;
    images: string[];
    isActive: boolean;
    slug: string | null;
    sku?: string | null;
    unitType?: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: { orderItems: number; reviews: number };
};

type Pagination = { page: number; limit: number; total: number; pages: number };

type Props = {
    /** Base path for this role's product routes, e.g. `/seller/products`. */
    basePath: string;
    /** SELLER or COMPANY — controls the available product type filters. */
    role: string;
};

const STATUS_OPTIONS = [
    { value: 'ALL', label: 'All statuses' },
    { value: 'ACTIVE', label: 'Published' },
    { value: 'ARCHIVED', label: 'Archived' },
];

const STOCK_OPTIONS = [
    { value: 'ALL', label: 'Any stock level' },
    { value: 'IN_STOCK', label: 'In stock' },
    { value: 'LOW_STOCK', label: 'Low stock' },
    { value: 'OUT_OF_STOCK', label: 'Out of stock' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'name', label: 'Name (A–Z)' },
    { value: 'price-desc', label: 'Price (high to low)' },
    { value: 'price-asc', label: 'Price (low to high)' },
    { value: 'stock-asc', label: 'Stock (low to high)' },
];

export default function ProductManager({ basePath, role }: Props) {
    const typeOptions = useMemo(() => getProductTypeOptions(role), [role]);

    const [products, setProducts] = useState<SellerProduct[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [type, setType] = useState('ALL');
    const [status, setStatus] = useState('ALL');
    const [stock, setStock] = useState('ALL');
    const [sort, setSort] = useState('newest');
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);

    const [pendingDelete, setPendingDelete] = useState<SellerProduct | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Debounce the search box so typing doesn't hammer the API.
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const isFirstLoad = useRef(true);

    const fetchProducts = useCallback(async () => {
        if (isFirstLoad.current) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }
        setLoadError(null);

        try {
            const params = new URLSearchParams({ page: String(page), sort });
            if (search) params.set('search', search);
            if (type !== 'ALL') params.set('type', type);
            if (status !== 'ALL') params.set('status', status);
            if (stock !== 'ALL') params.set('stock', stock);

            const response = await fetch(`/api/seller/products?${params.toString()}`);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.error || 'We could not load your products.');
            }

            setProducts(data.products || []);
            setPagination(data.pagination || null);
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'We could not load your products.');
        } finally {
            isFirstLoad.current = false;
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [page, search, sort, status, stock, type]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const hasActiveFilters =
        Boolean(search) || type !== 'ALL' || status !== 'ALL' || stock !== 'ALL';

    const clearFilters = () => {
        setSearchInput('');
        setSearch('');
        setType('ALL');
        setStatus('ALL');
        setStock('ALL');
        setPage(1);
    };

    const handleDelete = async () => {
        if (!pendingDelete || isDeleting) return;

        const target = pendingDelete;
        setIsDeleting(true);

        try {
            const response = await fetch(`/api/products/${target.id}`, { method: 'DELETE' });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.error || 'We could not delete this product.');
            }

            // Optimistically drop the row and keep the counters in sync.
            setProducts(current => current.filter(item => item.id !== target.id));
            setPagination(current =>
                current ? { ...current, total: Math.max(0, current.total - 1) } : current
            );
            toast.success(data?.message || `"${target.name}" was deleted.`);
            setPendingDelete(null);

            // Re-sync so pagination and counts reflect the server.
            fetchProducts();
        } catch (error) {
            // Failure keeps the product visible — nothing is removed from the list.
            toast.error(error instanceof Error ? error.message : 'We could not delete this product.');
        } finally {
            setIsDeleting(false);
        }
    };

    const totalLabel = pagination
        ? `${pagination.total} ${pagination.total === 1 ? 'product' : 'products'}`
        : null;

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <Card className="border-border/70">
                <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search
                                aria-hidden="true"
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            />
                            <Label htmlFor="product-search" className="sr-only">
                                Search products
                            </Label>
                            <Input
                                id="product-search"
                                value={searchInput}
                                onChange={event => setSearchInput(event.target.value)}
                                placeholder="Search by name, description or SKU"
                                className="pl-9 pr-9"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => setSearchInput('')}
                                    aria-label="Clear search"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowFilters(value => !value)}
                                aria-expanded={showFilters}
                                className="flex-1 sm:flex-none"
                            >
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                Filters
                                {hasActiveFilters && (
                                    <span className="ml-2 rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                                        on
                                    </span>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => fetchProducts()}
                                disabled={isLoading || isRefreshing}
                                aria-label="Refresh products"
                            >
                                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="filter-type" className="text-xs font-medium text-muted-foreground">
                                    Category
                                </Label>
                                <Select
                                    value={type}
                                    onValueChange={value => {
                                        setType(value);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger id="filter-type">
                                        <SelectValue placeholder="All categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All categories</SelectItem>
                                        {typeOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="filter-status" className="text-xs font-medium text-muted-foreground">
                                    Status
                                </Label>
                                <Select
                                    value={status}
                                    onValueChange={value => {
                                        setStatus(value);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger id="filter-status">
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="filter-stock" className="text-xs font-medium text-muted-foreground">
                                    Availability
                                </Label>
                                <Select
                                    value={stock}
                                    onValueChange={value => {
                                        setStock(value);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger id="filter-stock">
                                        <SelectValue placeholder="Any stock level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STOCK_OPTIONS.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="filter-sort" className="text-xs font-medium text-muted-foreground">
                                    Sort by
                                </Label>
                                <Select
                                    value={sort}
                                    onValueChange={value => {
                                        setSort(value);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger id="filter-sort">
                                        <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                        <SelectValue placeholder="Newest first" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SORT_OPTIONS.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {hasActiveFilters && (
                                <div className="sm:col-span-2 lg:col-span-4">
                                    <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                                        <X className="mr-2 h-4 w-4" />
                                        Clear filters
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {totalLabel && !isLoading && (
                        <p className="text-xs text-muted-foreground" aria-live="polite">
                            {totalLabel}
                            {hasActiveFilters ? ' matching your filters' : ''}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* States */}
            {isLoading ? (
                <ProductSkeleton />
            ) : loadError ? (
                <Card className="border-destructive/40">
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                        <div className="rounded-full bg-destructive/10 p-3">
                            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-foreground">Something went wrong</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
                        </div>
                        <Button type="button" variant="outline" onClick={() => fetchProducts()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Try again
                        </Button>
                    </CardContent>
                </Card>
            ) : products.length === 0 ? (
                <EmptyState
                    basePath={basePath}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={clearFilters}
                />
            ) : (
                <>
                    {/* Desktop table */}
                    <Card className="hidden overflow-hidden border-border/70 lg:block">
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="min-w-[260px]">Product</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[1%] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map(product => {
                                        const stockStatus = getStockStatus(product.stock);
                                        const publishStatus = getPublishStatus(product.isActive);

                                        return (
                                            <TableRow key={product.id} className={isRefreshing ? 'opacity-60' : undefined}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <ProductThumb product={product} />
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-foreground">{product.name}</p>
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {product.sku ? `SKU ${product.sku}` : product.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal">
                                                        {formatProductTypeLabel(product.type, product.customType)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium tabular-nums">
                                                    {formatCurrency(product.price)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm tabular-nums text-foreground">
                                                            {product.stock} {product.unitType || 'units'}
                                                        </span>
                                                        <Badge variant="outline" className={stockStatus.className}>
                                                            {stockStatus.label}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={publishStatus.className}>
                                                        {publishStatus.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <ProductActions
                                                        product={product}
                                                        basePath={basePath}
                                                        onDelete={() => setPendingDelete(product)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>

                    {/* Mobile / tablet cards */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                        {products.map(product => {
                            const stockStatus = getStockStatus(product.stock);
                            const publishStatus = getPublishStatus(product.isActive);

                            return (
                                <Card
                                    key={product.id}
                                    className={`border-border/70 ${isRefreshing ? 'opacity-60' : ''}`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex gap-3">
                                            <ProductThumb product={product} size={64} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="min-w-0 truncate font-semibold text-foreground">
                                                        {product.name}
                                                    </h3>
                                                    <ProductActions
                                                        product={product}
                                                        basePath={basePath}
                                                        onDelete={() => setPendingDelete(product)}
                                                    />
                                                </div>
                                                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                                                    {formatCurrency(product.price)}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {product.stock} {product.unitType || 'units'} ·{' '}
                                                    {formatProductTypeLabel(product.type, product.customType)}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    <Badge variant="outline" className={stockStatus.className}>
                                                        {stockStatus.label}
                                                    </Badge>
                                                    <Badge variant="outline" className={publishStatus.className}>
                                                        {publishStatus.label}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {pagination && pagination.pages > 1 && (
                        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                            <p className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.pages}
                            </p>
                            <div className="flex w-full gap-2 sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 sm:flex-none"
                                    disabled={page <= 1 || isRefreshing}
                                    onClick={() => setPage(current => Math.max(1, current - 1))}
                                >
                                    Previous
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 sm:flex-none"
                                    disabled={page >= pagination.pages || isRefreshing}
                                    onClick={() => setPage(current => current + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Delete confirmation */}
            <AlertDialog
                open={Boolean(pendingDelete)}
                onOpenChange={open => {
                    if (!open && !isDeleting) setPendingDelete(null);
                }}
            >
                <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete product?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    <span className="font-medium text-foreground">{pendingDelete?.name}</span> will be
                                    removed from your storefront and customers will no longer be able to buy it.
                                </p>
                                {pendingDelete && (pendingDelete._count?.orderItems ?? 0) > 0 ? (
                                    <p>
                                        This product appears in past orders, so its sales history and invoices are kept
                                        for your records.
                                    </p>
                                ) : (
                                    <p>This action cannot be undone.</p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                    Deleting…
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Delete product
                                </>
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function ProductThumb({ product, size = 44 }: { product: SellerProduct; size?: number }) {
    const image = product.images?.[0];

    return (
        <div
            className="relative shrink-0 overflow-hidden rounded-md border border-border bg-muted"
            style={{ width: size, height: size }}
        >
            {image ? (
                <Image
                    src={image}
                    alt={product.name}
                    fill
                    sizes={`${size}px`}
                    className="object-cover"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
            )}
        </div>
    );
}

function ProductActions({
    product,
    basePath,
    onDelete,
}: {
    product: SellerProduct;
    basePath: string;
    onDelete: () => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label={`Actions for ${product.name}`}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                    <Link href={`/product/${product.slug || product.id}`} target="_blank">
                        <Eye className="mr-2 h-4 w-4" />
                        View listing
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`${basePath}/${product.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit product
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onSelect={event => {
                        event.preventDefault();
                        onDelete();
                    }}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete product
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function EmptyState({
    basePath,
    hasActiveFilters,
    onClearFilters,
}: {
    basePath: string;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
}) {
    return (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="rounded-full bg-muted p-3">
                    <Package className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                </div>
                {hasActiveFilters ? (
                    <>
                        <h3 className="text-base font-semibold text-foreground">
                            No products match your search.
                        </h3>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            Try a different keyword, or clear the filters to see your full catalogue.
                        </p>
                        <Button type="button" variant="outline" onClick={onClearFilters}>
                            <X className="mr-2 h-4 w-4" />
                            Clear filters
                        </Button>
                    </>
                ) : (
                    <>
                        <h3 className="text-base font-semibold text-foreground">
                            Your product catalogue is empty.
                        </h3>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            Add your first product to start selling.
                        </p>
                        <Button asChild>
                            <Link href={`${basePath}/new`}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add product
                            </Link>
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function ProductSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
                <Card key={index} className="border-border/70">
                    <CardContent className="flex items-center gap-3 p-4">
                        <Skeleton className="h-11 w-11 shrink-0 rounded-md" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="hidden h-4 w-20 sm:block" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
