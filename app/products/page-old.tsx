'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  SlidersHorizontal,
  ArrowUpDown,
  Shield,
  Award,
  Crown,
  Zap,
  Leaf,
  MapPin,
  TrendingUp,
  Percent,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Plus,
  Minus,
  X,
  FilterX
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

const tagIcons = {
  VERIFIED: Shield,
  TRUSTED: Star,
  RECOMMENDED: Award,
  PREMIUM: Crown,
  FEATURED: Zap,
  ORGANIC: Leaf,
  LOCAL: MapPin,
  BESTSELLER: TrendingUp,
  DISCOUNTED: Percent,
  NEW_ARRIVAL: Star,
  LIMITED_STOCK: Package,
};

const tagColors = {
  VERIFIED: 'bg-blue-100 text-blue-800 border-blue-200',
  TRUSTED: 'bg-green-100 text-green-800 border-green-200',
  RECOMMENDED: 'bg-purple-100 text-purple-800 border-purple-200',
  PREMIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  FEATURED: 'bg-orange-100 text-orange-800 border-orange-200',
  ORGANIC: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  LOCAL: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  BESTSELLER: 'bg-pink-100 text-pink-800 border-pink-200',
  DISCOUNTED: 'bg-red-100 text-red-800 border-red-200',
  NEW_ARRIVAL: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  LIMITED_STOCK: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function PublicProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          // Load user's cart and favorites if logged in
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

  const fetchProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedType) params.append('type', selectedType);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
      if (priceRange[0] > 0) params.append('minPrice', priceRange[0].toString());
      if (priceRange[1] < 10000) params.append('maxPrice', priceRange[1].toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', currentPage.toString());
      params.append('limit', '12');

      const response = await fetch(`/api/products/public?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setFilters(data.filters);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedType, selectedTags, priceRange, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedTags([]);
    setPriceRange([0, 10000]);
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EGGS': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CHICKEN_MEAT': return 'bg-red-50 text-red-700 border-red-200';
      case 'CHICKEN_FEED': return 'bg-green-50 text-green-700 border-green-200';
      case 'CHICKS': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'HATCHING_EGGS': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(price);
  };

  const ProductCard = ({ product }: { product: any }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
        <div className="relative aspect-square overflow-hidden">
          {product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Package className="h-16 w-16 text-gray-400" />
            </div>
          )}
          
          {/* Discount Badge */}
          {product.isDiscounted && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-red-500 text-white">
                {product.discountPercentage ? `${product.discountPercentage}% OFF` : 'SALE'}
              </Badge>
            </div>
          )}

          {/* Product Type Badge */}
          <div className="absolute top-2 right-2">
            <Badge className={getTypeColor(product.type)}>
              {product.type.replace('_', ' ')}
            </Badge>
          </div>

          {/* Quick Actions */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex space-x-2">
              <Link href={`/product/${product.id}`}>
                <Button size="sm" variant="secondary" className="rounded-full">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
              <Button size="sm" variant="secondary" className="rounded-full">
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex flex-wrap gap-1 mb-2">
            {product.tags.map((tagData: any) => {
              const TagIcon = tagIcons[tagData.tag as keyof typeof tagIcons];
              return (
                <Badge 
                  key={tagData.tag} 
                  variant="outline"
                  className={`text-xs ${tagColors[tagData.tag as keyof typeof tagColors]}`}
                >
                  <TagIcon className="w-3 h-3 mr-1" />
                  {tagData.tag.replace('_', ' ')}
                </Badge>
              );
            })}
          </div>
          <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {product.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {/* Seller Info */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {product.seller.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{product.seller.name}</p>
                <div className="flex flex-wrap gap-1">
                  {product.seller.tags.map((tagData: any) => {
                    const TagIcon = tagIcons[tagData.tag as keyof typeof tagIcons];
                    return (
                      <Badge 
                        key={tagData.tag} 
                        variant="outline"
                        className="text-xs"
                      >
                        <TagIcon className="w-2 h-2 mr-1" />
                        {tagData.tag}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Rating */}
            {product.reviewCount > 0 && (
              <div className="flex items-center space-x-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.averageRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {product.averageRating} ({product.reviewCount})
                </span>
              </div>
            )}
            
            {/* Price */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-green-600">
                  ${product.currentPrice.toFixed(2)}
                </span>
                {product.isDiscounted && (
                  <span className="text-sm text-gray-500 line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {product.stock} in stock
              </span>
            </div>
            
            {/* Add to Cart Button */}
            <Link href="/auth/login">
              <Button 
                className="w-full"
                disabled={product.stock === 0}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Professional Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Egg className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">PoultryHub</span>
              </Link>
              <div className="hidden md:flex items-center space-x-6">
                <Link href="/products" className="text-emerald-600 font-medium">Products</Link>
                <Link href="/categories" className="text-gray-600 hover:text-emerald-600 transition-colors">Categories</Link>
                <Link href="/about" className="text-gray-600 hover:text-emerald-600 transition-colors">About</Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link 
                    href="/customer/cart" 
                    className="relative p-2 text-gray-600 hover:text-emerald-600 transition-colors"
                  >
                    <ShoppingCart className="w-6 h-6" />
                    {cartItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    )}
                  </Link>
                  <Link 
                    href="/customer/favorites" 
                    className="p-2 text-gray-600 hover:text-emerald-600 transition-colors"
                  >
                    <Heart className="w-6 h-6" />
                  </Link>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-600">Hi, {user.name}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link 
                    href="/auth/login" 
                    className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            Fresh Farm Products
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Discover premium quality eggs, chicken meat, feeds, and chicks from verified sellers across the country
          </motion.p>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SlidersHorizontal className="h-5 w-5" />
                <span>Filters & Search</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Type Filter */}
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Product type" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem value="">All Types</SelectItem> */}
                    {filters.types?.map((type: any) => (
                      <SelectItem key={type.type} value={type.type}>
                        {type.type.replace('_', ' ')} ({type._count.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Tag Filter */}
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem value="">All Tags</SelectItem> */}
                    {filters.tags?.map((tag: any) => (
                      <SelectItem key={tag.tag} value={tag.tag}>
                        {tag.tag.replace('_', ' ')} ({tag._count.tag})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Sort */}
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [sort, order] = value.split('-');
                  setSortBy(sort);
                  setSortOrder(order);
                }}>
                  <SelectTrigger>
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

              {/* Price Range */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Price:</label>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="w-20"
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="w-20"
                  />
                </div>
                <Button variant="outline" onClick={clearFilters} size="sm">
                  Clear Filters
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  {products.length} products found
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square bg-gray-200 animate-pulse" />
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
            <Button onClick={clearFilters}>Clear All Filters</Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}
          >
            <AnimatePresence>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center mt-12"
          >
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i + 1}
                  variant={currentPage === i + 1 ? 'default' : 'outline'}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}