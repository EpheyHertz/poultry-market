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
  Loader2
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
                <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border-gray-200 h-full flex flex-col bg-white/80 backdrop-blur-sm hover:bg-white">
                  <div className="aspect-square relative overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name || 'Product image'}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 flex items-center justify-center">
                        <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Overlay gradient for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Product Type Badge */}
                    <Badge className={`absolute top-3 left-3 ${getTypeColor(product.type)} shadow-lg font-medium z-10`}>
                      {product.type.replace('_', ' ')}
                    </Badge>

                    {/* Stock indicator */}
                    {(product.stock || 0) <= 5 && (product.stock || 0) > 0 && (
                      <Badge className="absolute top-3 right-3 bg-orange-500 text-white shadow-lg font-medium z-10">
                        Low Stock
                      </Badge>
                    )}
                    {(product.stock || 0) === 0 && (
                      <Badge className="absolute top-3 right-3 bg-red-500 text-white shadow-lg font-medium z-10">
                        Out of Stock
                      </Badge>
                    )}

                    {/* View Product overlay button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                      <Button 
                        variant="secondary"
                        className="bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white shadow-xl border-2 border-white/50 font-semibold px-6 py-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/product/${product.id}`);
                        }}
                      >
                        View Product
                      </Button>
                    </div>
                  </div>
                  
                  <CardHeader className="pb-3 p-4 sm:p-6 bg-gradient-to-b from-white to-gray-50/50">
                    <div className="space-y-2">
                      <CardTitle className="text-lg sm:text-xl font-bold line-clamp-1 text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {product.name || 'Untitled Product'}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-sm text-gray-600 leading-relaxed">
                        {product.description || 'No description available'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-4 sm:p-6 pt-0 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      {/* Seller Info with Tags */}
                      <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-100">
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="text-gray-500">Sold by:</span> 
                          <span className="font-semibold text-gray-900 ml-1">{product.seller?.name || 'Unknown Seller'}</span>
                        </p>
                        {product.seller?.tags && product.seller.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
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
                                  className={`text-xs ${tagColors[tagName as keyof typeof tagColors]} px-2 py-1 font-medium shadow-sm border border-opacity-20`}
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
                      
                      {/* Price and Stock */}
                      <div className="flex justify-between items-center bg-emerald-50/80 rounded-lg p-3 border border-emerald-100">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600 font-medium">Price</span>
                          <span className="text-xl sm:text-2xl font-bold text-emerald-600">
                            Ksh {(product.price || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-600 font-medium block">Stock</span>
                          <span className={`text-sm font-bold ${
                            (product.stock || 0) === 0 ? 'text-red-600' : 
                            (product.stock || 0) <= 5 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {product.stock || 0} units
                          </span>
                        </div>
                      </div>
                    </div>
                      
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/product/${product.id}`);
                        }}
                        className="h-10 text-sm font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200"
                      >
                        View Details
                      </Button>
                      <Button 
                        onClick={() => addToCart(product)}
                        disabled={(product.stock || 0) === 0}
                        className="h-10 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {(product.stock || 0) === 0 ? 'Sold Out' : 'Add to Cart'}
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