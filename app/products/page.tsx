'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Filter,
  Package,
  Star,
  ShoppingCart,
  Heart,
  Eye,
  Grid3X3,
  List,
  Shield,
  Award,
  Crown,
  Zap,
  Leaf,
  MapPin,
  TrendingUp,
  Percent,
  Plus,
  DollarSign,
  AlertTriangle,
  X
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { formatProductTypeLabel } from '@/lib/utils';

const tagIcons = {
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
  LIMITED_STOCK: AlertTriangle
};

const tagColors = {
  VERIFIED: 'text-green-700 bg-green-50 border-green-200',
  TRUSTED: 'text-blue-700 bg-blue-50 border-blue-200',
  RECOMMENDED: 'text-purple-700 bg-purple-50 border-purple-200',
  PREMIUM: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  FEATURED: 'text-amber-700 bg-amber-50 border-amber-200',
  ORGANIC: 'text-green-700 bg-green-50 border-green-200',
  LOCAL: 'text-gray-700 bg-gray-50 border-gray-200',
  BESTSELLER: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  TRENDING: 'text-red-700 bg-red-50 border-red-200',
  DISCOUNTED: 'text-orange-700 bg-orange-50 border-orange-200',
  DISCOUNT: 'text-orange-700 bg-orange-50 border-orange-200',
  NEW_ARRIVAL: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  NEW: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  LIMITED_STOCK: 'text-rose-700 bg-rose-50 border-rose-200'
};

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

type TypeFilterOption = {
  id: string;
  type: string;
  customType: string | null;
  label: string;
  count: number;
};

const formatTagLabel = (tag: string) => {
  return tag
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function PublicProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [availableTypes, setAvailableTypes] = useState<TypeFilterOption[]>([]);
  const [availableCategories, setAvailableCategories] = useState<FilterOption[]>([]);
  const [availableTags, setAvailableTags] = useState<FilterOption[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const initialPriceBoundsSet = useRef(false);
  const priceBoundsRef = useRef<[number, number]>([0, 10000]);

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
      params.append('limit', '12');

      const response = await fetch(`/api/products/public?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setTotalPages(data.pagination?.pages || 1);

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
            .map(location => location.trim());

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
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
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
    const handleResize = () => {
      const matches = window.matchMedia('(min-width: 1024px)').matches;
      setIsDesktop(matches);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setShowFilters(false);
    }
  }, [isDesktop]);

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EGGS': return 'bg-yellow-100 text-yellow-800';
      case 'CHICKEN_MEAT': return 'bg-red-100 text-red-800';
      case 'CHICKEN_FEED': return 'bg-green-100 text-green-800';
      case 'CHICKS': return 'bg-orange-100 text-orange-800';
      case 'HATCHING_EGGS': return 'bg-purple-100 text-purple-800';
      case 'CUSTOM': return 'bg-slate-100 text-slate-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(price);
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
  const selectedTypeLabel = (() => {
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
  })();
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

  const calculateDiscountMeta = (product: any) => {
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
    const discountPercent = Math.max(0, Math.round(Number.isFinite(explicitPercent) && explicitPercent > 0 ? explicitPercent : derivedPercent));

    const showDiscount = savings > 0 && discountPercent > 0;

    return { original, current, discountPercent, savings, showDiscount };
  };

  const FiltersPanel = ({ isDesktop, onClose }: { isDesktop: boolean; onClose?: () => void }) => {
    const quickTypeOptions = availableTypes.slice(0, isDesktop ? 8 : 6);
    const incubatorQuickOptions = quickTypeOptions.filter(option => option.label.toLowerCase().includes('incubat'));
    const tagDisplayLimit = isDesktop ? 18 : 12;

    const handleCategoryChange = (value: string) => {
      setSelectedCategory(value);
      setCurrentPage(1);
    };

    const handleTypeChange = (value: string) => {
      if (value === 'all') {
        setSelectedType('all');
        setSelectedCustomType(null);
      } else if (value.startsWith('custom::')) {
        const encodedValue = value.slice('custom::'.length);
        const customValue = decodeURIComponent(encodedValue);
        setSelectedType('CUSTOM');
        setSelectedCustomType(customValue);
      } else if (value.startsWith('type::')) {
        const baseValue = value.slice('type::'.length);
        setSelectedType(baseValue);
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
      setSelectedTags(prev => {
        const exists = prev.includes(value);
        return exists ? prev.filter(tag => tag !== value) : [...prev, value];
      });
      setCurrentPage(1);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Filters</h2>
            {hasActiveFilters ? (
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                {activeFiltersCount} active filter{activeFiltersCount === 1 ? '' : 's'} applied.
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                Refine incubator gear, equipment, and stock by type, location, tags, and budget.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearFilters();
                  if (!isDesktop) {
                    onClose?.();
                  }
                }}
                className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              >
                Reset
              </Button>
            )}
            {!isDesktop && (
              <Button
                variant="outline"
                size="icon"
                onClick={onClose}
                className="rounded-full h-9 w-9 border-gray-200 dark:border-neutral-700 hover:border-emerald-300 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close filters</span>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Category</label>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-10 border-gray-200 dark:border-neutral-700 focus:border-emerald-300 dark:focus:border-emerald-400 rounded-lg bg-white/80 dark:bg-neutral-900/70 text-gray-900 dark:text-neutral-100">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                    {category.count ? ` (${category.count})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Type</label>
            <Select value={typeSelectValue} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-10 border-gray-200 dark:border-neutral-700 focus:border-emerald-300 dark:focus:border-emerald-400 rounded-lg bg-white/80 dark:bg-neutral-900/70 text-gray-900 dark:text-neutral-100">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {availableTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                    {type.count ? ` (${type.count})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Location</label>
            <Select value={selectedLocation} onValueChange={handleLocationChange}>
              <SelectTrigger className="h-10 border-gray-200 dark:border-neutral-700 focus:border-emerald-300 dark:focus:border-emerald-400 rounded-lg bg-white/80 dark:bg-neutral-900/70 text-gray-900 dark:text-neutral-100">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {availableLocations.map(location => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {quickTypeOptions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-neutral-200">Quick type filters</p>
              {incubatorQuickOptions.length > 0 && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
                  Incubator-ready options highlighted
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {quickTypeOptions.map(option => {
                const isActive = selectedCustomType
                  ? option.customType === selectedCustomType
                  : selectedType === option.type && !option.customType;
                const isIncubator = option.label.toLowerCase().includes('incubat');
                return (
                  <Button
                    key={option.id}
                    type="button"
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTypeChange(isActive ? 'all' : option.id)}
                    className={`rounded-full border transition-colors ${
                      isActive
                        ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white'
                        : 'border-gray-200 dark:border-neutral-700 hover:border-emerald-300 dark:hover:border-emerald-400'
                    } ${isIncubator ? 'ring-1 ring-emerald-400/50 dark:ring-emerald-500/40' : ''}`}
                  >
                    <span>{option.label}</span>
                    {option.count ? (
                      <span className="ml-1 text-xs opacity-80">{option.count}</span>
                    ) : null}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {availableTags.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-neutral-200">
              Popular attributes & incubator features
            </p>
            <div className="flex flex-wrap gap-2">
              {availableTags.slice(0, tagDisplayLimit).map(tag => {
                const isActive = selectedTags.includes(tag.value);
                const emphasise = tag.value.toLowerCase().includes('incubat');
                return (
                  <Button
                    key={tag.value}
                    type="button"
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleTag(tag.value)}
                    className={`rounded-full border transition-colors ${
                      isActive
                        ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white'
                        : 'border-gray-200 dark:border-neutral-700 hover:border-emerald-300 dark:hover:border-emerald-400 text-gray-700 dark:text-neutral-200'
                    } ${emphasise ? 'ring-1 ring-emerald-400/50 dark:ring-emerald-500/40' : ''}`}
                  >
                    <span>{tag.label}</span>
                    {tag.count ? (
                      <span className="ml-1 text-xs opacity-80">{tag.count}</span>
                    ) : null}
                  </Button>
                );
              })}
            </div>
            {availableTags.length > tagDisplayLimit && (
              <p className="text-xs text-gray-500 dark:text-neutral-400">
                Narrow it further by combining multiple tags like capacity, power source, and humidity control.
              </p>
            )}
          </div>
        )}

        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-400/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-neutral-200 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-emerald-600" />
              Price Range
            </h3>
            <span className="text-xs font-medium text-gray-600 dark:text-neutral-300 bg-white/80 dark:bg-neutral-900/80 px-2 py-1 rounded-md shadow-sm">
              {priceRangeLabel}
            </span>
          </div>
          <Slider
            value={priceRange}
            onValueChange={(value: number[]) => {
              setPriceRange(value as [number, number]);
              setCurrentPage(1);
            }}
            max={sliderMax}
            min={sliderMin}
            step={100}
            className="w-full"
          />
          <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-neutral-400">
            <span>{formatPrice(sliderMin)}</span>
            <span>{formatPrice(sliderMax)}</span>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-neutral-400 mr-2">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs">
                Search: {searchTerm}
              </Badge>
            )}
            {selectedCategoryLabel && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200 text-xs">
                Category: {selectedCategoryLabel}
              </Badge>
            )}
            {selectedTypeLabel && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200 text-xs">
                Type: {selectedTypeLabel}
              </Badge>
            )}
            {selectedLocationLabel && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200 text-xs">
                Location: {selectedLocationLabel}
              </Badge>
            )}
            {selectedTags.length > 0 && selectedTags.map(tag => {
              const tagLabel = availableTags.find(option => option.value === tag)?.label || formatTagLabel(tag);
              return (
                <Badge key={tag} variant="secondary" className="bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200 text-xs">
                  Tag: {tagLabel}
                </Badge>
              );
            })}
            {(priceRange[0] > defaultPriceMin || priceRange[1] < defaultPriceMax) && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-200 text-xs">
                Price: {priceRangeLabel}
              </Badge>
            )}
          </div>
        )}

        {!isDesktop && (
          <div className="flex items-center gap-3 pt-2">
            <Button
              className="flex-1 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm"
              onClick={onClose}
            >
              Show Results
            </Button>
            <Button
              variant="outline"
              className="h-10 border-gray-200 dark:border-neutral-700 hover:border-emerald-300 dark:hover:border-emerald-400"
              onClick={() => {
                clearFilters();
                onClose?.();
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </div>
    );
  };

  const ProductCard = ({ product }: { product: any }) => {
    const { original: originalPrice, current: displayPrice, discountPercent, savings, showDiscount } = calculateDiscountMeta(product);
    const unitLabel = product.unit || 'piece';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.2, type: "spring", stiffness: 400 }}
        className="h-full"
      >
        <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg dark:hover:shadow-emerald-500/10 transition-all duration-300 group bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 hover:border-emerald-200 dark:hover:border-emerald-500/40">
          <div className="relative aspect-[4/3] sm:aspect-square overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <div className="relative w-full h-full">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-800 flex items-center justify-center">
                <div className="text-center">
                  <Package className="h-8 w-8 sm:h-12 sm:w-12 text-emerald-300 dark:text-emerald-400 mx-auto mb-1" />
                  <span className="text-emerald-600 dark:text-emerald-300 text-xs font-medium">No Image</span>
                </div>
              </div>
            )}
            
            {/* Discount Badge */}
            {showDiscount && (
              <div className="absolute top-2 left-2 z-10">
                <div className="bg-gradient-to-r from-red-500 to-pink-500 dark:from-red-500/90 dark:to-pink-500/90 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-md">
                  <div className="flex items-center space-x-1">
                    <Percent className="h-3 w-3" />
                    <span>-{discountPercent}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Product Type Badge */}
            <div className="absolute top-2 right-2 z-10">
              <Badge className={`${getTypeColor(product.type)} shadow-sm border-0 text-xs py-0 px-2 h-5 dark:shadow-none`}>
                {formatProductTypeLabel(product.type, product.customType)}
              </Badge>
            </div>

            {/* Quick Actions Overlay */}
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
              <div className="flex space-x-2">
                <Link href={`/product/${product.id}`}>
                  <Button size="sm" className="rounded-full h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700 dark:text-neutral-800 shadow-lg">
                    <Eye className="h-3 w-3" />
                  </Button>
                </Link>
                <Button 
                  size="sm" 
                  className="rounded-full h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700 dark:text-neutral-800 shadow-lg"
                  onClick={() => toggleFavorite(product.id)}
                >
                  <Heart className={`h-3 w-3 transition-colors ${favorites.has(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Stock Status Badge */}
            {product.stock <= 5 && product.stock > 0 && (
              <div className="absolute bottom-2 left-2 z-10">
                <div className="bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-medium shadow-sm">
                  {product.stock} left
                </div>
              </div>
            )}
            
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg">
                  Out of Stock
                </div>
              </div>
            )}
          </div>
          
          {/* Card Content */}
          <div className="flex-1 flex flex-col p-3 sm:p-4">
            {/* Product Header */}
            <div className="mb-2 sm:mb-3">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-neutral-100 line-clamp-2 group-hover:text-emerald-600 transition-colors duration-300 leading-tight">
                  {product.name}
                </h3>
                {product.reviewCount > 0 && (
                  <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-500/10 px-1.5 py-0.5 rounded-md ml-2 flex-shrink-0">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                      {(product.averageRating || 0).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 dark:text-neutral-400 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="mb-2 sm:mb-3">
                <div className="flex flex-wrap gap-1">
                  {product.tags.slice(0, 2).map((tagData: any) => {
                    const TagIcon = tagIcons[tagData.tag as keyof typeof tagIcons] || Star;
                    return (
                      <div
                        key={tagData.tag}
                        className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium shadow-sm ${tagColors[tagData.tag as keyof typeof tagColors] || 'text-gray-700 bg-gray-50 dark:bg-neutral-800 dark:text-neutral-300'}`}
                      >
                        <TagIcon className="w-2.5 h-2.5" />
                        <span>{tagData.tag}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seller Info */}
            {product.seller && (
              <div className="mb-2 sm:mb-3 p-2 bg-gray-50 dark:bg-neutral-800/60 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {product.seller.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-neutral-200 text-xs sm:text-sm truncate">{product.seller.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="mb-2 sm:mb-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  {showDiscount ? (
                    <div className="space-y-0.5">
                      <span className="text-lg sm:text-xl font-bold text-emerald-600">
                        {formatPrice(displayPrice)}
                      </span>
                      <div className="flex items-center space-x-1">
                        {originalPrice && (
                          <span className="text-xs text-gray-500 dark:text-neutral-500 line-through">
                            {formatPrice(originalPrice)}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/15 px-1.5 py-0.5 rounded-md">
                          Save {formatPrice(savings)} · {discountPercent}% off
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-neutral-100">
                      {formatPrice(displayPrice)}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-neutral-500">per {unitLabel}</span>
                </div>
                
                {/* Stock indicator */}
                <div className="text-right">
                  {product.stock > 10 ? (
                    <div className="text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-end">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></div>
                      In Stock
                    </div>
                  ) : product.stock > 0 ? (
                    <div className="text-orange-600 dark:text-orange-300 text-xs font-medium flex items-center justify-end">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1"></div>
                      {product.stock} left
                    </div>
                  ) : (
                    <div className="text-red-600 dark:text-red-300 text-xs font-medium flex items-center justify-end">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                      Out of Stock
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add to Cart Section */}
            <div className="mt-auto">
              {user ? (
                getCartQuantity(product.id) > 0 ? (
                  <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-400/10 rounded-lg px-3 py-2 border border-emerald-100 dark:border-emerald-500/20">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <ShoppingCart className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium text-sm">
                        {getCartQuantity(product.id)} in cart
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addToCart(product.id, 1)}
                      disabled={product.stock === 0}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 h-7 w-7 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full h-9 text-xs sm:text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
                    disabled={product.stock === 0}
                    onClick={() => addToCart(product.id, 1)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">
                      {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </span>
                  </Button>
                )
              ) : (
                <Link href="/auth/login" className="block">
                  <Button 
                    className="w-full h-9 text-xs sm:text-sm font-medium bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 dark:from-neutral-700 dark:to-neutral-800 dark:hover:from-neutral-600 dark:hover:to-neutral-700"
                    disabled={product.stock === 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">
                      {product.stock === 0 ? 'Out of Stock' : 'Login to Add to Cart'}
                    </span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen scroll-smooth bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900 text-gray-900 dark:text-neutral-100">
      {/* Mobile-Optimized Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/90 dark:bg-neutral-900/80 backdrop-blur-lg shadow-sm dark:shadow-[0_10px_30px_-20px_rgba(0,0,0,0.7)] border-b border-gray-100 dark:border-neutral-800 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="order-1 flex items-center space-x-2 sm:space-x-3 flex-shrink-0"
            >
              <Link href="/" className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  PoultryHub
                </span>
              </Link>
            </motion.div>

            <div className="order-2 w-full sm:flex-1 sm:min-w-[260px]">
              <label className="sr-only" htmlFor="product-search">Search listings</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-neutral-500" />
                <Input
                  id="product-search"
                  type="search"
                  placeholder="Search listings..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 h-11 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-800/80 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:border-emerald-400 focus:ring-emerald-200"
                />
              </div>
            </div>

            <div className="order-3 w-full sm:w-auto flex justify-end">
              <div className="flex items-center space-x-2 sm:space-x-4">
                {user ? (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-2 sm:space-x-4"
                  >
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                      <Link 
                        href="/customer/cart" 
                        className="relative p-2 sm:p-3 text-gray-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 rounded-lg sm:rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      >
                        <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                        {cartItems.length > 0 && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-semibold shadow-lg"
                          >
                            {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                          </motion.span>
                        )}
                      </Link>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="hidden sm:block">
                      <Link 
                        href="/customer/favorites" 
                        className="p-2 sm:p-3 text-gray-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 rounded-lg sm:rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      >
                        <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                      </Link>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-emerald-100 dark:border-emerald-500/20"
                    >
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-md">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:block">Hi, {user.name}</span>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-3"
                  >
                    <Link href="/auth/login">
                      <Button 
                        variant="ghost" 
                        className="text-gray-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all duration-300"
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/register">
                      <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                        Get Started
                      </Button>
                    </Link>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isDesktop && (
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={() => setShowFilters(true)}
              variant="outline"
              className="flex items-center gap-2 border-gray-200 dark:border-neutral-700 hover:border-emerald-300 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg"
            >
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
            </Button>
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
        )}

        <AnimatePresence>
          {!isDesktop && showFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex"
            >
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40"
                onClick={() => setShowFilters(false)}
              />
              <motion.div
                key="panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                className="relative ml-auto h-full w-full max-w-sm bg-white dark:bg-neutral-900 shadow-2xl border-l border-gray-200 dark:border-neutral-800 p-6 overflow-y-auto"
              >
                <FiltersPanel isDesktop={false} onClose={() => setShowFilters(false)} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
            <div className="sticky top-28">
              <div className="bg-white/90 dark:bg-neutral-900/80 backdrop-blur rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-lg dark:shadow-[0_25px_50px_-30px_rgba(0,0,0,0.8)] p-6">
                <FiltersPanel isDesktop />
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex flex-col gap-6">
              {/* View Mode and Sort Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-300 dark:border-neutral-700 rounded-lg overflow-hidden">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-none"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-none"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>

                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                    const [field, order] = value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}>
                    <SelectTrigger className="w-48 border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/70 text-gray-900 dark:text-neutral-100">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt-desc">Newest First</SelectItem>
                      <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      <SelectItem value="name-asc">Name: A to Z</SelectItem>
                      <SelectItem value="name-desc">Name: Z to A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  {hasActiveFilters && isDesktop && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      {activeFiltersCount} active filter{activeFiltersCount === 1 ? '' : 's'}
                    </Badge>
                  )}
                  <div className="text-sm text-gray-600 dark:text-neutral-400">
                    {products.length} product{products.length !== 1 ? 's' : ''} found
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-neutral-400">
                  <span className="font-medium text-gray-700 dark:text-neutral-200">Active filters:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs">
                      Search: {searchTerm}
                    </Badge>
                  )}
                  {selectedCategory !== 'all' && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200 text-xs">
                      Category: {selectedCategoryLabel ?? formatTagLabel(selectedCategory.replace(/-/g, '_'))}
                    </Badge>
                  )}
                  {selectedTypeLabel && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200 text-xs">
                      Type: {selectedTypeLabel}
                    </Badge>
                  )}
                  {selectedLocation !== 'all' && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200 text-xs">
                      Location: {selectedLocationLabel ?? selectedLocation}
                    </Badge>
                  )}
                  {selectedTags.map(tag => {
                    const tagLabel = availableTags.find(option => option.value === tag)?.label || formatTagLabel(tag);
                    return (
                      <Badge key={tag} variant="secondary" className="bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200 text-xs">
                        Tag: {tagLabel}
                      </Badge>
                    );
                  })}
                  {(minPriceIsActive || maxPriceIsActive) && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-200 text-xs">
                      Price: {priceRangeLabel}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-1 text-emerald-600 dark:text-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                  >
                    Reset
                  </Button>
                </div>
              )}

              {/* Products Grid */}
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                  {[...Array(24)].map((_, i) => (
                    <Card key={i} className="overflow-hidden animate-pulse h-64 sm:h-72 lg:h-80 bg-white dark:bg-neutral-900 border border-transparent dark:border-neutral-800">
                      <div className="aspect-[4/3] sm:aspect-square bg-gray-200 dark:bg-neutral-800" />
                      <div className="p-2 sm:p-3 lg:p-4 space-y-2">
                        <div className="h-3 sm:h-4 bg-gray-200 dark:bg-neutral-800 rounded w-3/4" />
                        <div className="h-2 sm:h-3 bg-gray-200 dark:bg-neutral-800 rounded w-1/2" />
                        <div className="h-4 sm:h-6 bg-gray-200 dark:bg-neutral-800 rounded w-1/3" />
                        <div className="h-6 sm:h-8 bg-gray-200 dark:bg-neutral-800 rounded" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <Package className="w-20 h-20 text-gray-400 dark:text-neutral-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-neutral-100 mb-2">No products found</h3>
                  <p className="text-gray-600 dark:text-neutral-400 mb-6">Try adjusting your search terms or filters</p>
                  <Button onClick={clearFilters} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    Clear All Filters
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`grid gap-3 sm:gap-4 lg:gap-5 ${
                    viewMode === 'grid'
                      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                      : 'grid-cols-1 max-w-4xl mx-auto'
                  }`}
                >
                  <AnimatePresence>
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Compact Pagination */}
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center mt-2 pb-8"
                >
                  <div className="flex items-center space-x-2 bg-white dark:bg-neutral-900 rounded-lg shadow-sm dark:shadow-[0_10px_25px_-25px_rgba(0,0,0,0.7)] border border-gray-200 dark:border-neutral-800 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="h-8"
                    >
                      Previous
                    </Button>
                    <div className="flex space-x-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8"
                    >
                      Next
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}