'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { DashboardContent, DashboardGrid, DashboardCard } from '@/components/layout/dashboard-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Package,
  Star,
  Shield,
  Award,
  Crown,
  Zap,
  Leaf,
  MapPin,
  TrendingUp,
  Loader2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const tagIcons = {
  VERIFIED: Shield,
  TRUSTED: Star,
  RECOMMENDED: Award,
  PREMIUM: Crown,
  FEATURED: Zap,
  ORGANIC: Leaf,
  LOCAL: MapPin,
  BESTSELLER: TrendingUp,
};

const tagColors = {
  VERIFIED: 'bg-blue-100 text-blue-800',
  TRUSTED: 'bg-green-100 text-green-800',
  RECOMMENDED: 'bg-purple-100 text-purple-800',
  PREMIUM: 'bg-yellow-100 text-yellow-800',
  FEATURED: 'bg-orange-100 text-orange-800',
  ORGANIC: 'bg-emerald-100 text-emerald-800',
  LOCAL: 'bg-cyan-100 text-cyan-800',
  BESTSELLER: 'bg-pink-100 text-pink-800',
};

export default function CustomerProducts() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'CUSTOMER') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter && typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      
      const response = await fetch(`/api/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        let sortedProducts = data.products;
        
        // Apply sorting
        if (sortBy === 'price_low') {
          sortedProducts = sortedProducts.sort((a: any, b: any) => a.price - b.price);
        } else if (sortBy === 'price_high') {
          sortedProducts = sortedProducts.sort((a: any, b: any) => b.price - a.price);
        } else if (sortBy === 'name') {
          sortedProducts = sortedProducts.sort((a: any, b: any) => a.name.localeCompare(b.name));
        }
        // For 'default' or any other value, keep original order
        
        setProducts(sortedProducts);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }, [typeFilter, sortBy]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user, typeFilter, sortBy, fetchProducts]);

  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart!`);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.id === productId 
        ? { ...item, quantity }
        : item
    ));
  };

  const proceedToCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // For now, handle single item checkout (first item in cart)
    // TODO: Implement multi-item cart checkout sessions
    const firstItem = cart[0];
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: firstItem.id,
          quantity: firstItem.quantity,
          paymentType: 'BEFORE_DELIVERY'
        })
      });

      if (response.ok) {
        const { sessionId } = await response.json();
        router.push(`/customer/checkout?session=${sessionId}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create checkout session');
      }
    } catch (error) {
      toast.error('Failed to proceed to checkout');
    }
  };

  const filteredProducts = products.filter(product => {
    if (!product) return false;
    
    const productName = product.name || '';
    const productDescription = product.description || '';
    
    const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         productDescription.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EGGS': return 'bg-yellow-100 text-yellow-800';
      case 'CHICKEN_MEAT': return 'bg-red-100 text-red-800';
      case 'CHICKEN_FEED': return 'bg-green-100 text-green-800';
      case 'CHICKS': return 'bg-orange-100 text-orange-800';
      case 'HATCHING_EGGS': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <DashboardContent 
        title="Browse Products" 
        description="Fresh farm products from verified sellers"
      >
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 sm:space-y-8"
        >
        {/* Cart Summary - Only show if cart has items */}
        <AnimatePresence>
          {cart.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="w-full shadow-md border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center justify-between text-green-800">
                    <span className="flex items-center">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Cart ({cart.length})
                    </span>
                    <span className="text-green-600 font-bold">Ksh {cartTotal.toFixed(2)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cart && cart.length > 0 && cart.slice(0, 2).map((item) => (
                    <motion.div 
                      key={item.id} 
                      className="flex justify-between items-center text-sm bg-white rounded-lg p-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="truncate flex-1 mr-2 font-medium">{item.name}</span>
                      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-6 w-6 p-0 border-green-200 hover:bg-green-50"
                        >
                          -
                        </Button>
                        <span className="min-w-[20px] text-center font-semibold">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-6 w-6 p-0 border-green-200 hover:bg-green-50"
                        >
                          +
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                  {cart.length > 2 && (
                    <p className="text-xs text-green-700 font-medium">+{cart.length - 2} more items</p>
                  )}
                  <Button 
                    onClick={proceedToCheckout} 
                    className="w-full mt-3 bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Filter className="h-5 w-5 text-gray-600" />
              <span>Filters & Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="EGGS">Eggs</SelectItem>
                  <SelectItem value="CHICKEN_MEAT">Chicken Meat</SelectItem>
                  <SelectItem value="CHICKEN_FEED">Chicken Feed</SelectItem>
                  <SelectItem value="CHICKS">Chicks</SelectItem>
                  <SelectItem value="HATCHING_EGGS">Hatching Eggs</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 sm:col-span-2 lg:col-span-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, staggerChildren: 0.1 }}
        >
          {filteredProducts.length === 0 ? (
            <motion.div 
              className="col-span-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-sm">
                <CardContent className="text-center py-8 sm:py-12">
                  <Package className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">
                    Try adjusting your search or filter criteria.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -5 }}
              >
                <Card className="group relative overflow-hidden hover:shadow-2xl transition-all duration-500 border-2 border-gray-200 hover:border-emerald-400 h-full flex flex-col bg-white hover:bg-gradient-to-br hover:from-white hover:to-emerald-50/40 rounded-2xl shadow-lg hover:shadow-emerald-500/20">
                  <div className="aspect-square relative overflow-hidden rounded-t-2xl">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name || 'Product image'}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-100 via-emerald-50 to-white flex items-center justify-center">
                        <Package className="h-16 w-16 sm:h-20 sm:w-20 text-emerald-400" />
                      </div>
                    )}
                    
                    {/* Enhanced overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Product Type Badge */}
                    <Badge className={`absolute top-4 left-4 ${getTypeColor(product.type)} shadow-lg font-semibold text-xs px-3 py-1.5 z-10 border border-white/50 backdrop-blur-sm`}>
                      {product.type.replace('_', ' ')}
                    </Badge>

                    {/* Stock indicator */}
                    {(product.stock || 0) <= 5 && (product.stock || 0) > 0 && (
                      <Badge className="absolute top-4 right-4 bg-orange-500 text-white shadow-lg font-semibold text-xs px-3 py-1.5 z-10 border border-white/50 backdrop-blur-sm">
                        ⚠️ Low Stock
                      </Badge>
                    )}
                    {(product.stock || 0) === 0 && (
                      <Badge className="absolute top-4 right-4 bg-red-500 text-white shadow-lg font-semibold text-xs px-3 py-1.5 z-10 border border-white/50 backdrop-blur-sm">
                        ❌ Out of Stock
                      </Badge>
                    )}

                    {/* Enhanced View Product overlay button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-20">
                      <Button 
                        size="lg"
                        className="bg-white text-gray-900 hover:bg-emerald-600 hover:text-white shadow-2xl border-3 border-white font-bold px-8 py-3 text-base rounded-full transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/product/${product.id}`);
                        }}
                      >
                        👁️ View Product
                      </Button>
                    </div>
                  </div>
                  
                  <CardHeader className="pb-4 p-6 bg-gradient-to-b from-white via-gray-50/30 to-transparent border-b border-gray-100">
                    <div className="space-y-3">
                      <CardTitle className="text-xl sm:text-2xl font-black line-clamp-2 text-gray-900 group-hover:text-emerald-700 transition-colors duration-300 leading-tight">
                        {product.name || 'Untitled Product'}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 text-sm text-gray-600 leading-relaxed font-medium">
                        {product.description || 'No description available'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-between space-y-5 bg-gradient-to-b from-transparent to-gray-50/50">
                    <div className="space-y-5">
                      {/* Enhanced Seller Info with Tags */}
                      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-emerald-200 shadow-sm">
                        <p className="text-sm text-gray-700 mb-3 flex items-center">
                          <span className="text-gray-500 font-medium">🏪 Sold by:</span> 
                          <span className="font-bold text-gray-900 ml-2">{product.seller?.name || 'Unknown Seller'}</span>
                        </p>
                        {product.seller?.tags && product.seller.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {product.seller.tags.map((tagData: any, index: number) => {
                              // Safety checks for nested properties
                              if (!tagData || !tagData.tag || !tagData.tag.tag) {
                                return null;
                              }
                              
                              const tagName = tagData.tag.tag;
                              const TagIcon = tagIcons[tagName as keyof typeof tagIcons];
                              return (
                                <Badge 
                                  key={`${product.seller.id}-${tagName}-${index}`} 
                                  className={`text-xs ${tagColors[tagName as keyof typeof tagColors]} px-3 py-1.5 font-bold shadow-md border border-opacity-30 hover:scale-105 transition-transform duration-200`}
                                >
                                  {TagIcon && <TagIcon className="w-3 h-3 mr-1.5" />}
                                  <span className="hidden sm:inline">{tagName}</span>
                                  <span className="sm:hidden">{tagName.slice(0, 3)}</span>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* Enhanced Price and Stock */}
                      <div className="flex justify-between items-center bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-4 border-2 border-emerald-200 shadow-md">
                        <div className="flex flex-col">
                          <span className="text-sm text-emerald-700 font-bold mb-1">💰 Price</span>
                          <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                            Ksh {(product.price || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-emerald-700 font-bold block mb-1">📦 Stock</span>
                          <span className={`text-lg font-black px-3 py-1 rounded-lg ${
                            (product.stock || 0) === 0 ? 'text-red-700 bg-red-100' : 
                            (product.stock || 0) <= 5 ? 'text-orange-700 bg-orange-100' : 'text-green-700 bg-green-100'
                          }`}>
                            {product.stock || 0} units
                          </span>
                        </div>
                      </div>
                    </div>
                      
                    {/* Enhanced Action Buttons */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <Button 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/product/${product.id}`);
                        }}
                        className="h-12 text-sm font-bold border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button 
                        onClick={() => addToCart(product)}
                        disabled={(product.stock || 0) === 0}
                        className={`h-12 text-sm font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                          (product.stock || 0) === 0 
                            ? 'bg-gray-400 hover:bg-gray-400 text-gray-600 cursor-not-allowed shadow-none transform-none' 
                            : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {(product.stock || 0) === 0 ? '❌ Sold Out' : '🛒 Add to Cart'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
        </motion.div>
      </DashboardContent>
    </DashboardLayout>
  );
}