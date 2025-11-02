'use client';

import { useState, useEffect, useCallback } from 'react';
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
  FilterX,
  Tag,
  DollarSign,
  RefreshCw,
  Truck
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { formatProductTypeLabel } from '@/lib/utils';

const tagIcons = {
  VERIFIED: Shield,
  TRUSTED: Star,
  RECOMMENDED: Award,
  PREMIUM: Crown,
  ORGANIC: Leaf,
  LOCAL: MapPin,
  TRENDING: TrendingUp,
  DISCOUNT: Percent,
  NEW: Zap
};

const tagColors = {
  VERIFIED: 'text-green-700 bg-green-50 border-green-200',
  TRUSTED: 'text-blue-700 bg-blue-50 border-blue-200',
  RECOMMENDED: 'text-purple-700 bg-purple-50 border-purple-200',
  PREMIUM: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  ORGANIC: 'text-green-700 bg-green-50 border-green-200',
  LOCAL: 'text-gray-700 bg-gray-50 border-gray-200',
  TRENDING: 'text-red-700 bg-red-50 border-red-200',
  DISCOUNT: 'text-orange-700 bg-orange-50 border-orange-200',
  NEW: 'text-indigo-700 bg-indigo-50 border-indigo-200'
};

export default function PublicProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
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
        setProducts(data.products || []);
        setFilters(data.filters || {});
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedType, selectedCategory, selectedLocation, selectedTags, priceRange, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedLocation('all');
    setSelectedTags([]);
    setPriceRange([0, 10000]);
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

  const ProductCard = ({ product }: { product: any }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, type: "spring", stiffness: 400 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 group bg-white rounded-xl border border-gray-100 hover:border-emerald-200">
        <div className="relative aspect-[4/3] sm:aspect-square overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <div className="relative w-full h-full">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
              <div className="text-center">
                <Package className="h-8 w-8 sm:h-12 sm:w-12 text-emerald-300 mx-auto mb-1" />
                <span className="text-emerald-600 text-xs font-medium">No Image</span>
              </div>
            </div>
          )}
          
          {/* Compact Discount Badge */}
          {product.isDiscounted && (
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-md">
                <div className="flex items-center space-x-1">
                  <Percent className="h-2 w-2" />
                  <span>{product.discountPercentage ? `${product.discountPercentage}%` : 'SALE'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Compact Product Type Badge */}
          <div className="absolute top-2 right-2 z-10">
            <Badge className={`${getTypeColor(product.type)} shadow-sm border-0 text-xs py-0 px-2 h-5`}>
              {formatProductTypeLabel(product.type, product.customType)}
            </Badge>
          </div>

          {/* Quick Actions Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
            <div className="flex space-x-2">
              <Link href={`/product/${product.id}`}>
                <Button size="sm" className="rounded-full h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700 shadow-lg">
                  <Eye className="h-3 w-3" />
                </Button>
              </Link>
              <Button 
                size="sm" 
                className="rounded-full h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700 shadow-lg"
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
        
        {/* Compact Card Content */}
        <div className="flex-1 flex flex-col p-3 sm:p-4">
          {/* Product Header - Compact */}
          <div className="mb-2 sm:mb-3">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2 group-hover:text-emerald-600 transition-colors duration-300 leading-tight">
                {product.name}
              </h3>
              {product.reviewCount > 0 && (
                <div className="flex items-center space-x-1 bg-yellow-50 px-1.5 py-0.5 rounded-md ml-2 flex-shrink-0">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-xs font-semibold text-yellow-700">
                    {(product.averageRating || 0).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Compact Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="mb-2 sm:mb-3">
              <div className="flex flex-wrap gap-1">
                {product.tags.slice(0, 2).map((tagData: any) => {
                  const TagIcon = tagIcons[tagData.tag as keyof typeof tagIcons] || Star;
                  return (
                    <div
                      key={tagData.tag}
                      className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium shadow-sm ${tagColors[tagData.tag as keyof typeof tagColors] || 'text-gray-700 bg-gray-50'}`}
                    >
                      <TagIcon className="w-2.5 h-2.5" />
                      <span>{tagData.tag}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compact Seller Info */}
          {product.seller && (
            <div className="mb-2 sm:mb-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-xs font-bold text-white">
                    {product.seller.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-xs sm:text-sm truncate">{product.seller.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Compact Pricing Section */}
          <div className="mb-2 sm:mb-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                {product.isDiscounted && product.originalPrice ? (
                  <div className="space-y-0.5">
                    <span className="text-lg sm:text-xl font-bold text-emerald-600">
                      {formatPrice(product.price)}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                        Save {formatPrice(product.originalPrice - product.price)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                )}
                <span className="text-xs text-gray-500">per {product.unit || 'piece'}</span>
              </div>
              
              {/* Compact Stock indicator */}
              <div className="text-right">
                {product.stock > 10 ? (
                  <div className="text-emerald-600 text-xs font-medium flex items-center">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></div>
                    In Stock
                  </div>
                ) : product.stock > 0 ? (
                  <div className="text-orange-600 text-xs font-medium flex items-center">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1"></div>
                    {product.stock} left
                  </div>
                ) : (
                  <div className="text-red-600 text-xs font-medium flex items-center">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                    Out of Stock
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compact Add to Cart Section */}
          <div className="mt-auto">
            {user ? (
              getCartQuantity(product.id) > 0 ? (
                <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg px-3 py-2 border border-emerald-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-emerald-700 font-medium text-sm">
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
                  className="w-full h-9 text-xs sm:text-sm font-medium bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400"
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 scroll-smooth">
      {/* Mobile-Optimized Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/90 backdrop-blur-lg shadow-sm border-b border-gray-100 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2 sm:space-x-3"
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
                      className="relative p-2 sm:p-3 text-gray-600 hover:text-emerald-600 transition-all duration-300 rounded-lg sm:rounded-xl hover:bg-emerald-50"
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
                      className="p-2 sm:p-3 text-gray-600 hover:text-emerald-600 transition-all duration-300 rounded-lg sm:rounded-xl hover:bg-emerald-50"
                    >
                      <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Link>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-emerald-50 to-teal-50 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-emerald-100"
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
                      className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-300"
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
      </motion.div>

      {/* Mobile-Optimized Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white py-12 sm:py-16 lg:py-20 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-transparent"
          >
            Premium Poultry Products
          </motion.h1>
          <motion.p 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-cyan-100 mb-6 sm:mb-8 max-w-3xl mx-auto px-4"
          >
            Discover fresh, high-quality poultry products from trusted local farmers and suppliers
          </motion.p>
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm px-4"
          >
            <div className="flex items-center space-x-1 sm:space-x-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Quality Assured</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Fast Delivery</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full">
              <Star className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Trusted Suppliers</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Mobile-Optimized Collapsible Filters Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white/90 backdrop-blur-lg shadow-lg border-b border-gray-100 sticky top-14 sm:top-16 z-40"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          {/* Mobile Filter Toggle */}
          <div className="block lg:hidden mb-4">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="w-full flex items-center justify-between py-3 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Filters & Search</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
              
          {/* Desktop Filters Bar */}
          <div className="hidden lg:flex items-center space-x-4 mb-4">
            {/* Quick Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 h-10 border-gray-200 focus:border-emerald-300 focus:ring-emerald-200 rounded-lg bg-white/80 backdrop-blur-sm"
              />
            </div>
            
            {/* Active filters count */}
            {(searchTerm || selectedCategory !== 'all' || selectedType !== 'all' || selectedLocation !== 'all') && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                Active filters
              </Badge>
            )}
          </div>

          {/* Collapsible Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent className="CollapsibleContent">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 lg:pt-0">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-300 rounded-lg bg-white/80">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="chicken">Chicken</SelectItem>
                        <SelectItem value="eggs">Eggs</SelectItem>
                        <SelectItem value="duck">Duck</SelectItem>
                        <SelectItem value="turkey">Turkey</SelectItem>
                        <SelectItem value="feed">Feed & Supplies</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-300 rounded-lg bg-white/80">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="live">Live Birds</SelectItem>
                        <SelectItem value="fresh">Fresh Meat</SelectItem>
                        <SelectItem value="processed">Processed</SelectItem>
                        <SelectItem value="organic">Organic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger className="h-9 border-gray-200 focus:border-emerald-300 rounded-lg bg-white/80">
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="nairobi">Nairobi</SelectItem>
                        <SelectItem value="mombasa">Mombasa</SelectItem>
                        <SelectItem value="nakuru">Nakuru</SelectItem>
                        <SelectItem value="eldoret">Eldoret</SelectItem>
                        <SelectItem value="kisumu">Kisumu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters Button */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      className="w-full h-9 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg"
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* Price Range Filter */}
                <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-emerald-600" />
                      Price Range
                    </h3>
                    <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-md shadow-sm">
                      KSh {priceRange[0]} - KSh {priceRange[1]}
                    </span>
                  </div>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={10000}
                    min={0}
                    step={100}
                    className="w-full"
                  />
                </div>

                {/* Active Filters Display */}
                {(searchTerm || selectedCategory !== 'all' || selectedType !== 'all' || selectedLocation !== 'all') && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-sm text-gray-600 mr-2">Active filters:</span>
                    {searchTerm && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                        Search: {searchTerm}
                      </Badge>
                    )}
                    {selectedCategory !== 'all' && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                        Category: {selectedCategory}
                      </Badge>
                    )}
                    {selectedType !== 'all' && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                        Type: {selectedType}
                      </Badge>
                    )}
                    {selectedLocation !== 'all' && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                        Location: {selectedLocation}
                      </Badge>
                    )}
                  </div>
                )}
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Mode and Sort Controls */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
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
              <SelectTrigger className="w-48">
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

          <div className="text-sm text-gray-600">
            {products.length} product{products.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Products Grid - Mobile-Optimized for scrolling */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
            {[...Array(24)].map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse h-64 sm:h-72 lg:h-80">
                <div className="aspect-[4/3] sm:aspect-square bg-gray-200"></div>
                <div className="p-2 sm:p-3 lg:p-4">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4 mb-1 sm:mb-2"></div>
                  <div className="h-2 sm:h-3 bg-gray-200 rounded w-1/2 mb-2 sm:mb-3"></div>
                  <div className="h-4 sm:h-6 bg-gray-200 rounded w-1/3 mb-2 sm:mb-3"></div>
                  <div className="h-6 sm:h-8 bg-gray-200 rounded"></div>
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
            <Package className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search terms or filters</p>
            <Button onClick={clearFilters} className="bg-emerald-500 hover:bg-emerald-600">
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
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' 
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
            className="flex justify-center mt-8 pb-8"
          >
            <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
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
  );
}