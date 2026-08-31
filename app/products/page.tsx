'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Heart,
  LayoutGrid,
  List,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme';
import { cn, formatProductTypeLabel } from '@/lib/utils';

import ProductCard, { ProductCardSkeleton } from './product-card';
import ProductFilters from './product-filters';
import {
  brandButtonClass,
  formatPrice,
  formatTagLabel,
  type FilterOption,
  type TypeFilterOption,
} from './product-helpers';

const PAGE_SIZE = 12;

export default function PublicProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCustomType, setSelectedCustomType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [availableTypes, setAvailableTypes] = useState<TypeFilterOption[]>([]);
  const [availableCategories, setAvailableCategories] = useState<FilterOption[]>([]);
  const [availableTags, setAvailableTags] = useState<FilterOption[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const initialPriceBoundsSet = useRef(false);
  const priceBoundsRef = useRef<[number, number]>([0, 10000]);
  /** After the first successful load, filter changes refresh in place instead of blanking the grid. */
  const hasLoadedOnce = useRef(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          if (userData.role === 'CUSTOMER') {
            await loadCartItems();
            await loadFavorites();
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loadCartItems = async () => {
    try {
      const response = await fetch('/api/cart');
      if (response.ok) {
        const data = await response.json();
        setCartItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(new Set(data.favorites?.map((f: any) => f.productId) || []));
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedType && selectedType !== 'all') params.append('type', selectedType);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedLocation && selectedLocation !== 'all') params.append('location', selectedLocation);
      if (selectedTags.length > 0) {
        selectedTags.forEach(tagValue => params.append('tag', tagValue));
      }
      if (selectedCustomType) params.append('customType', selectedCustomType);
      const currentBounds = priceBoundsRef.current;
      const minIsDefault = priceRange[0] <= currentBounds[0];
      const maxIsDefault = priceRange[1] >= currentBounds[1];
      if (!minIsDefault) params.append('minPrice', priceRange[0].toString());
      if (!maxIsDefault) params.append('maxPrice', priceRange[1].toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', currentPage.toString());
      params.append('limit', String(PAGE_SIZE));

      const response = await fetch(`/api/products/public?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLoadError(null);
        hasLoadedOnce.current = true;
        setProducts(data.products || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalProducts(Number(data.pagination?.total ?? (data.products?.length || 0)));

        const filtersData = data.filters ?? {};

        if (Array.isArray(filtersData.types)) {
          const deduped = new Map<string, TypeFilterOption>();

          filtersData.types
            .filter((item: any) => item?.type)
            .forEach((item: any) => {
              const baseType: string = item.type;
              const rawCustomType = typeof item.customType === 'string' ? item.customType.trim() : '';
              const customTypeValue: string | null = rawCustomType.length > 0 ? rawCustomType : null;
              const count: number = Number(item.count ?? item?._count?.type ?? item?._count?.customType ?? 0) || 0;
              const id = customTypeValue ? `custom::${encodeURIComponent(customTypeValue)}` : `type::${baseType}`;
              const label = customTypeValue && customTypeValue.trim().length > 0
                ? customTypeValue
                : formatProductTypeLabel(baseType, customTypeValue ?? undefined);

              if (!customTypeValue || customTypeValue.trim().length > 0) {
                const existing = deduped.get(id);
                if (existing) {
                  existing.count += count;
                } else {
                  deduped.set(id, {
                    id,
                    type: baseType,
                    customType: customTypeValue,
                    label,
                    count
                  });
                }
              }
            });

          const normalizedTypes = Array.from(deduped.values()).sort((a, b) => {
            const aIncubator = a.label.toLowerCase().includes('incubat') ? 1 : 0;
            const bIncubator = b.label.toLowerCase().includes('incubat') ? 1 : 0;
            if (bIncubator !== aIncubator) {
              return bIncubator - aIncubator;
            }
            if (b.count === a.count) {
              return a.label.localeCompare(b.label);
            }
            return b.count - a.count;
          });

          setAvailableTypes(normalizedTypes);
        } else {
          setAvailableTypes([]);
        }

        if (Array.isArray(filtersData.categories)) {
          setAvailableCategories(
            filtersData.categories
              .filter((item: any) => item?.slug || item?.id)
              .map((item: any) => ({
                value: item.slug || item.id,
                label: item.name || item.slug || item.id,
                count: item?._count?.products ?? 0,
              }))
              .sort((a: FilterOption, b: FilterOption) => {
                if (b.count === a.count) {
                  return a.label.localeCompare(b.label);
                }
                return b.count - a.count;
              })
          );
        } else {
          setAvailableCategories([]);
        }

        if (Array.isArray(filtersData.tags)) {
          setAvailableTags(
            filtersData.tags
              .filter((item: any) => item?.tag)
              .map((item: any) => ({
                value: item.tag,
                label: formatTagLabel(item.tag),
                count: item?._count?.tag ?? 0,
              }))
              .sort((a: FilterOption, b: FilterOption) => {
                const incubKeywords = ['incubat', 'infrared', 'heater', 'humidity', 'brooder'];
                const aBoost = incubKeywords.some(keyword => a.label.toLowerCase().includes(keyword)) ? 1 : 0;
                const bBoost = incubKeywords.some(keyword => b.label.toLowerCase().includes(keyword)) ? 1 : 0;
                if (bBoost !== aBoost) {
                  return bBoost - aBoost;
                }
                if (b.count === a.count) {
                  return a.label.localeCompare(b.label);
                }
                return b.count - a.count;
              })
          );
        } else {
          setAvailableTags([]);
        }

        if (Array.isArray(filtersData.locations)) {
          const normalizedLocations = filtersData.locations
            .filter((value: any): value is string => typeof value === 'string' && value.trim().length > 0)
            .map((location: string) => location.trim());

          setAvailableLocations(
            (Array.from(new Set(normalizedLocations)) as string[]).sort((a, b) => a.localeCompare(b))
          );
        } else {
          setAvailableLocations([]);
        }

        const minRaw = Number(filtersData.priceRange?._min?.price);
        const maxRaw = Number(filtersData.priceRange?._max?.price);
        if (Number.isFinite(minRaw) || Number.isFinite(maxRaw)) {
          const min = Number.isFinite(minRaw) ? Math.max(0, Math.floor(minRaw)) : currentBounds[0];
          const max = Number.isFinite(maxRaw) ? Math.max(min, Math.ceil(maxRaw)) : Math.max(min, currentBounds[1]);
          const bounds: [number, number] = [min, max];
          setPriceBounds(bounds);
          if (!initialPriceBoundsSet.current) {
            initialPriceBoundsSet.current = true;
            setPriceRange(bounds);
          }
        }
      } else {
        setLoadError('We could not load products right now.');
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setLoadError('We could not load products right now.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedType, selectedCustomType, selectedCategory, selectedLocation, selectedTags, priceRange, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    priceBoundsRef.current = priceBounds;
  }, [priceBounds]);

  useEffect(() => {
    const [minBound, maxBound] = priceBoundsRef.current;
    setPriceRange(prev => {
      const clampedMin = Math.max(minBound, Math.min(prev[0], maxBound));
      const clampedMax = Math.max(clampedMin, Math.min(prev[1], maxBound));
      if (clampedMin === prev[0] && clampedMax === prev[1]) {
        return prev;
      }
      return [clampedMin, clampedMax];
    });
  }, [priceBounds]);

  useEffect(() => {
    setSelectedTags(prev => {
      const filtered = prev.filter(tag => availableTags.some(option => option.value === tag));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [availableTags]);

  useEffect(() => {
    if (selectedType === 'all' && !selectedCustomType) {
      return;
    }

    const hasMatch = availableTypes.some(option => {
      if (selectedCustomType) {
        return option.customType === selectedCustomType;
      }
      return option.type === selectedType && !option.customType;
    });

    if (!hasMatch) {
      setSelectedType('all');
      setSelectedCustomType(null);
    }
  }, [availableTypes, selectedType, selectedCustomType]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !availableCategories.some(option => option.value === selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [availableCategories, selectedCategory]);

  useEffect(() => {
    if (selectedLocation !== 'all' && !availableLocations.includes(selectedLocation)) {
      setSelectedLocation('all');
    }
  }, [availableLocations, selectedLocation]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCustomType(null);
    setSelectedCategory('all');
    setSelectedLocation('all');
    setSelectedTags([]);
    setPriceRange([...priceBoundsRef.current] as [number, number]);
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });

      if (response.ok) {
        toast.success('Added to cart successfully!');
        await loadCartItems();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      const isFavorite = favorites.has(productId);
      const response = await fetch('/api/favorites', {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });

      if (response.ok) {
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          if (isFavorite) {
            newFavorites.delete(productId);
            toast.success('Removed from favorites');
          } else {
            newFavorites.add(productId);
            toast.success('Added to favorites');
          }
          return newFavorites;
        });
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const getCartQuantity = (productId: string) => {
    const item = cartItems.find(item => item.productId === productId);
    return item?.quantity || 0;
  };

  const defaultPriceMin = priceBounds[0];
  const defaultPriceMax = priceBounds[1];
  const minPriceIsActive = priceRange[0] > defaultPriceMin;
  const maxPriceIsActive = priceRange[1] < defaultPriceMax;
  const sliderMin = Math.max(0, defaultPriceMin);
  const sliderMax = Math.max(sliderMin + 100, defaultPriceMax || sliderMin + 100);
  const priceRangeLabel = `${formatPrice(priceRange[0])} - ${formatPrice(priceRange[1])}`;
  const typeSelectValue = selectedCustomType
    ? `custom::${encodeURIComponent(selectedCustomType)}`
    : selectedType === 'all'
      ? 'all'
      : `type::${selectedType}`;

  const selectedTypeLabel = useMemo(() => {
    if (selectedType === 'all' && !selectedCustomType) {
      return null;
    }

    const match = availableTypes.find(option => {
      if (selectedCustomType) {
        return option.customType === selectedCustomType;
      }
      return option.type === selectedType && !option.customType;
    });

    if (match) {
      return match.label;
    }

    if (selectedCustomType) {
      return selectedCustomType;
    }

    return formatProductTypeLabel(selectedType, selectedCustomType ?? undefined);
  }, [availableTypes, selectedType, selectedCustomType]);

  const selectedCategoryLabel = selectedCategory === 'all'
    ? null
    : availableCategories.find(option => option.value === selectedCategory)?.label || formatTagLabel(selectedCategory.replace(/-/g, '_'));
  const selectedLocationLabel = selectedLocation === 'all'
    ? null
    : availableLocations.includes(selectedLocation)
      ? selectedLocation
      : formatTagLabel(selectedLocation.replace(/-/g, '_'));

  const hasActiveFilters = Boolean(
    searchTerm ||
    selectedCategory !== 'all' ||
    selectedType !== 'all' ||
    selectedCustomType ||
    selectedLocation !== 'all' ||
    selectedTags.length > 0 ||
    minPriceIsActive ||
    maxPriceIsActive
  );

  const activeFiltersCount = [
    searchTerm ? 'search' : null,
    selectedCategory !== 'all' ? 'category' : null,
    selectedType !== 'all' ? 'type' : null,
    selectedLocation !== 'all' ? 'location' : null,
    selectedTags.length > 0 ? 'tags' : null,
    minPriceIsActive ? 'minPrice' : null,
    maxPriceIsActive ? 'maxPrice' : null,
  ].filter(Boolean).length;

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleTypeChange = (value: string) => {
    if (value === 'all') {
      setSelectedType('all');
      setSelectedCustomType(null);
    } else if (value.startsWith('custom::')) {
      const customValue = decodeURIComponent(value.slice('custom::'.length));
      setSelectedType('CUSTOM');
      setSelectedCustomType(customValue);
    } else if (value.startsWith('type::')) {
      setSelectedType(value.slice('type::'.length));
      setSelectedCustomType(null);
    } else {
      setSelectedType(value);
      setSelectedCustomType(null);
    }
    setCurrentPage(1);
  };

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    setCurrentPage(1);
  };

  const toggleTag = (value: string) => {
    setSelectedTags(prev => (prev.includes(value) ? prev.filter(tag => tag !== value) : [...prev, value]));
    setCurrentPage(1);
  };

  const handlePriceRangeChange = (value: [number, number]) => {
    setPriceRange(value);
    setCurrentPage(1);
  };

  const filterProps = {
    availableCategories,
    availableTypes,
    availableTags,
    availableLocations,
    selectedCategory,
    typeSelectValue,
    selectedType,
    selectedCustomType,
    selectedLocation,
    selectedTags,
    priceRange,
    sliderMin,
    sliderMax,
    priceRangeLabel,
    hasActiveFilters,
    activeFiltersCount,
    onCategoryChange: handleCategoryChange,
    onTypeChange: handleTypeChange,
    onLocationChange: handleLocationChange,
    onToggleTag: toggleTag,
    onPriceRangeChange: handlePriceRangeChange,
    onClearFilters: clearFilters,
  };

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (searchTerm) {
    activeChips.push({
      key: 'search',
      label: `“${searchTerm}”`,
      onRemove: () => {
        setSearchTerm('');
        setCurrentPage(1);
      },
    });
  }
  if (selectedCategoryLabel) {
    activeChips.push({
      key: 'category',
      label: selectedCategoryLabel,
      onRemove: () => handleCategoryChange('all'),
    });
  }
  if (selectedTypeLabel) {
    activeChips.push({
      key: 'type',
      label: selectedTypeLabel,
      onRemove: () => handleTypeChange('all'),
    });
  }
  if (selectedLocationLabel) {
    activeChips.push({
      key: 'location',
      label: selectedLocationLabel,
      onRemove: () => handleLocationChange('all'),
    });
  }
  selectedTags.forEach(tag => {
    activeChips.push({
      key: `tag-${tag}`,
      label: availableTags.find(option => option.value === tag)?.label || formatTagLabel(tag),
      onRemove: () => toggleTag(tag),
    });
  });
  if (minPriceIsActive || maxPriceIsActive) {
    activeChips.push({
      key: 'price',
      label: priceRangeLabel,
      onRemove: () => handlePriceRangeChange([...priceBoundsRef.current] as [number, number]),
    });
  }

  /** Full skeletons only on the very first paint; later fetches dim the existing grid instead. */
  const showSkeletons = (loading || authLoading) && !hasLoadedOnce.current;
  const isRefreshing = loading && hasLoadedOnce.current;
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const rangeStart = totalProducts === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalProducts);
  const resultsSummary = showSkeletons
    ? 'Loading products…'
    : totalProducts === 0
      ? 'No products'
      : totalPages > 1
        ? `${rangeStart}–${rangeEnd} of ${totalProducts} products`
        : `${totalProducts} product${totalProducts === 1 ? '' : 's'}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Utility bar: brand, search, account actions */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 sm:flex-nowrap">
            <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950">
                <Package className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-base font-bold tracking-tight sm:text-lg">PoultryHub</span>
            </Link>

            <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
              <label className="sr-only" htmlFor="product-search">
                Search products
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="product-search"
                  type="search"
                  placeholder="Search products, feed, equipment…"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-lg pl-9 pr-9"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div className="order-2 ml-auto flex shrink-0 items-center gap-1 sm:order-3 sm:ml-0">
              <ThemeToggle />
              {user ? (
                <>
                  <Button asChild variant="ghost" size="icon" className="relative h-9 w-9">
                    <Link href="/customer/cart" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
                      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      {cartCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white dark:bg-emerald-500 dark:text-emerald-950">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" className="hidden h-9 w-9 sm:inline-flex">
                    <Link href="/customer/favorites" aria-label="Favorites">
                      <Heart className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <span className="ml-1 hidden max-w-[10rem] truncate text-sm text-muted-foreground md:inline">
                    Hi, {user.name}
                  </span>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                  <Button asChild size="sm" className={brandButtonClass}>
                    <Link href="/auth/register">Get started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Poultry products &amp; supplies</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Buy eggs, chicks, feed, meat and farm equipment from verified sellers across Kenya.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Desktop filters */}
          <aside className="hidden w-72 shrink-0 lg:block xl:w-80">
            <div className="sticky top-20 rounded-xl border border-border bg-card p-5 shadow-sm">
              <ProductFilters variant="sidebar" {...filterProps} />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 lg:hidden">
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[11px]">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-md">
                  <SheetTitle className="mb-4 text-base">Filter products</SheetTitle>
                  <ProductFilters
                    variant="sheet"
                    {...filterProps}
                    onClose={() => setShowFilters(false)}
                  />
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1 sm:order-3 sm:flex-none">
                <p
                  className="flex items-center gap-1.5 truncate text-sm text-muted-foreground"
                  aria-live="polite"
                  aria-busy={loading}
                >
                  {isRefreshing && (
                    <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
                  )}
                  <span className="truncate font-medium tabular-nums">{resultsSummary}</span>
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2 sm:order-2">
                <label className="sr-only" htmlFor="product-sort">
                  Sort products
                </label>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={(value) => {
                    const [field, order] = value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                >
                  <SelectTrigger id="product-sort" className="h-10 w-[10.5rem]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">Newest first</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest first</SelectItem>
                    <SelectItem value="price-asc">Price: low to high</SelectItem>
                    <SelectItem value="price-desc">Price: high to low</SelectItem>
                    <SelectItem value="name-asc">Name: A to Z</SelectItem>
                    <SelectItem value="name-desc">Name: Z to A</SelectItem>
                  </SelectContent>
                </Select>

                <div
                  className="hidden items-center rounded-lg border border-border p-0.5 sm:flex"
                  role="group"
                  aria-label="View mode"
                >
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-9 w-9"
                    aria-label="Grid view"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-9 w-9"
                    aria-label="List view"
                    aria-pressed={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active filters */}
            {activeChips.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {activeChips.map(chip => (
                  <span
                    key={chip.key}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted py-1 pl-2.5 pr-1 text-xs font-medium text-foreground"
                  >
                    <span className="truncate">{chip.label}</span>
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      aria-label={`Remove filter ${chip.label}`}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Results */}
            {showSkeletons ? (
              <div
                className={cn(
                  'grid gap-3 sm:gap-4',
                  viewMode === 'grid'
                    ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1'
                )}
              >
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <ProductCardSkeleton key={i} view={viewMode} />
                ))}
              </div>
            ) : loadError ? (
              <Card className="flex flex-col items-center gap-3 border-border px-6 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-semibold">Something went wrong</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {loadError} Please check your connection and try again.
                </p>
                <Button onClick={() => fetchProducts()} className={cn('mt-1 gap-2', brandButtonClass)}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </Button>
              </Card>
            ) : products.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 border-border px-6 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Package className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-semibold">No products found</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? 'No listings match your current search and filters. Try removing a filter or widening your price range.'
                    : 'There are no active listings right now. Please check back soon.'}
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} className={cn('mt-1', brandButtonClass)}>
                    Clear all filters
                  </Button>
                )}
              </Card>
            ) : (
              <div
                className={cn(
                  'grid gap-3 transition-opacity duration-200 sm:gap-4',
                  viewMode === 'grid'
                    ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1',
                  isRefreshing && 'pointer-events-none opacity-60'
                )}
              >
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    view={viewMode}
                    isAuthenticated={Boolean(user)}
                    isFavorite={favorites.has(product.id)}
                    cartQuantity={getCartQuantity(product.id)}
                    onAddToCart={addToCart}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loadError && totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-9"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                        aria-label={`Page ${pageNum}`}
                        className={cn('h-9 w-9 p-0', currentPage === pageNum && brandButtonClass)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9"
                >
                  Next
                </Button>
              </nav>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
