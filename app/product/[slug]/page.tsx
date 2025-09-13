'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Heart, 
  Share2, 
  ShoppingCart, 
  Star, 
  MapPin, 
  Calendar, 
  Eye, 
  Package, 
  Zap,
  Clock,
  Plus,
  Minus,
  ZoomIn,
  ThumbsUp,
  MessageCircle,
  Shield,
  Award,
  Crown,
  Leaf,
  TrendingUp,
  Percent,
  User,
  Edit,
  Flag,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import ChatWidget from '@/components/chat/chat-widget';
import { formatCurrency } from '@/lib/formatCurrency';
import { Suspense } from 'react';

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

function ProductDetailContent() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const router = useRouter();

  const [product, setProduct] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
    images: []
  });
  const [timeLeft, setTimeLeft] = useState<any>(null);

  useEffect(() => {
    fetchProduct();
    fetchUser();
  }, [slug]);

  useEffect(() => {
    if (product) {
      fetchRelatedProducts();
      fetchStoreProducts();
    }
  }, [product]);

  useEffect(() => {
    if (product?.hasDiscount && product?.discountEndDate) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const endTime = new Date(product.discountEndDate).getTime();
        const distance = endTime - now;

        if (distance > 0) {
          setTimeLeft({
            days: Math.floor(distance / (1000 * 60 * 60 * 24)),
            hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((distance % (1000 * 60)) / 1000)
          });
        } else {
          setTimeLeft(null);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [product]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);

        // Update view count
        await fetch(`/api/products/${slug}/view`, { method: 'POST' });
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch(`/api/products?type=${product.type}&limit=8&exclude=${product.id}`);
      if (response.ok) {
        const data = await response.json();
        setRelatedProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch related products:', error);
    }
  };

  const fetchStoreProducts = async () => {
    try {
      const response = await fetch(`/api/products?sellerId=${product.sellerId}&limit=6&exclude=${product.id}`);
      if (response.ok) {
        const data = await response.json();
        setStoreProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch store products:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      router.push('/auth/login');
      return;
    }

    setAddingToCart(true);
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity
        })
      });

      if (response.ok) {
        toast.success('Added to cart successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error('Please login to purchase');
      router.push('/auth/login');
      return;
    }

    setBuyingNow(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
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
    } finally {
      setBuyingNow(false);
    }
  };

  // Helper function for adding any product to cart
  const handleAddToCartGeneric = async (productId: string, productQuantity: number = 1) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      router.push('/auth/login');
      return;
    }

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: productQuantity
        })
      });

      if (response.ok) {
        toast.success('Added to cart successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  // Helper function for direct checkout of any product
  const handleDirectCheckout = async (targetProduct: any, productQuantity: number = 1) => {
    if (!user) {
      toast.error('Please login to purchase');
      router.push('/auth/login');
      return;
    }

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            productId: targetProduct.id,
            quantity: productQuantity,
            productName: targetProduct.name
          }],
          type: 'direct'
        })
      });

      const data = await response.json();
      if (response.ok) {
        router.push(`/customer/checkout/${data.sessionId}`);
      } else {
        toast.error(data.error || 'Failed to proceed to checkout');
      }
    } catch (error) {
      toast.error('Failed to proceed to checkout');
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please login to like products');
      return;
    }

    try {
      const response = await fetch(`/api/products/${product.id}/like`, {
        method: 'POST'
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        toast.success(isLiked ? 'Removed from favorites' : 'Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update like status');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Product link copied to clipboard');
    }
  };

  const applyVoucher = async () => {
    if (!voucherCode.trim()) return;

    try {
      const response = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherCode,
          productId: product.id,
          orderAmount: getCurrentPrice() * quantity
        })
      });

      if (response.ok) {
        const voucher = await response.json();
        setAppliedVoucher(voucher);
        toast.success('Voucher applied successfully');
      } else {
        toast.error('Invalid or expired voucher');
      }
    } catch (error) {
      toast.error('Failed to apply voucher');
    }
  };

  const submitReview = async () => {
    if (!user) {
      toast.error('Please login to submit a review');
      return;
    }

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewData.rating,
          comment: reviewData.comment,
          images: reviewData.images
        })
      });

      if (response.ok) {
        toast.success('Review submitted successfully');
        setShowReviewForm(false);
        setReviewData({ rating: 5, comment: '', images: [] });
        fetchProduct(); // Refresh product data
      } else {
        toast.error('Failed to submit review');
      }
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  const getCurrentPrice = () => {
    let price = product.price;

    // Apply product discount if active
    if (product.hasDiscount && product.discountStartDate && product.discountEndDate) {
      const now = new Date();
      const startDate = new Date(product.discountStartDate);
      const endDate = new Date(product.discountEndDate);

      if (now >= startDate && now <= endDate) {
        if (product.discountType === 'PERCENTAGE') {
          price = price * (1 - product.discountAmount / 100);
        } else {
          price = Math.max(0, price - product.discountAmount);
        }
      }
    }

    // Apply voucher discount if applicable
    if (appliedVoucher) {
      if (appliedVoucher.discountType === 'PERCENTAGE') {
        price = price * (1 - appliedVoucher.discountValue / 100);
      } else {
        price = Math.max(0, price - appliedVoucher.discountValue);
      }
    }

    return price;
  };

  const getDiscountPercentage = () => {
    if (!product.hasDiscount) return 0;

    const now = new Date();
    const startDate = new Date(product.discountStartDate);
    const endDate = new Date(product.discountEndDate);

    if (now >= startDate && now <= endDate) {
      if (product.discountType === 'PERCENTAGE') {
        return product.discountAmount;
      } else {
        return Math.round((product.discountAmount / product.price) * 100);
      }
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
            <Loader2 className="animate-spin h-16 w-16 text-blue-600 mx-auto relative z-10" />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Loading Product
          </h3>
          <p className="text-gray-600 text-lg">Preparing amazing details for you...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-orange-400/20 rounded-full blur-xl"></div>
            <Package className="h-20 w-20 text-gray-400 mx-auto relative z-10" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
            Product Not Found
          </h2>
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            The product you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <Link href="/products">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl px-8 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300">
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/5 to-purple-400/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/5 to-blue-400/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
            {/* Product Images */}
            <div className="space-y-6">
              <motion.div
                className="aspect-square bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden relative group cursor-pointer shadow-2xl border border-white/50"
                onClick={() => setIsZoomed(true)}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <Image
                  src={product.images[selectedImageIndex] || '/placeholder.jpg'}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <ZoomIn className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                {/* Enhanced Discount Badge */}
                {getDiscountPercentage() > 0 && (
                  <div className="absolute top-6 left-6">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-full shadow-xl backdrop-blur-sm border border-red-400/50 animate-pulse">
                      <span className="font-bold text-lg">{getDiscountPercentage()}% OFF</span>
                    </div>
                  </div>
                )}

                {/* Navigation arrows */}
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) => 
                          prev === 0 ? product.images.length - 1 : prev - 1
                        );
                      }}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl hover:scale-110"
                    >
                      <ChevronLeft className="h-6 w-6 text-gray-800" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) => 
                          prev === product.images.length - 1 ? 0 : prev + 1
                        );
                      }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl hover:scale-110"
                    >
                      <ChevronRight className="h-6 w-6 text-gray-800" />
                    </button>
                  </>
                )}

                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </motion.div>

              {/* Enhanced Thumbnail Gallery */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {product.images.map((image: string, index: number) => (
                    <motion.div
                      key={index}
                      className={`aspect-square bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden cursor-pointer border-3 transition-all duration-300 shadow-lg hover:shadow-xl ${
                        selectedImageIndex === index 
                          ? 'border-blue-500 shadow-blue-500/25 scale-105' 
                          : 'border-white/50 hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedImageIndex(index)}
                      whileHover={{ scale: selectedImageIndex === index ? 1.05 : 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-110"
                        sizes="(max-width: 768px) 25vw, 12.5vw"
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Enhanced Product Info */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/50"
              >
                {/* Breadcrumb */}
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
                  <Link href="/products" className="hover:text-blue-600 transition-colors">Products</Link>
                  <span>/</span>
                  <span className="text-gray-900 font-medium">{product.name}</span>
                </div>

                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4 leading-tight">
                  {product.name}
                </h1>
                <p className="text-gray-600 mb-6 text-lg leading-relaxed">{product.description}</p>

                {/* Enhanced Tags */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <Badge className={`${tagColors[product.type as keyof typeof tagColors]} text-sm px-4 py-2 rounded-full font-semibold shadow-lg`}>
                    {product.type.replace('_', ' ')}
                  </Badge>
                  {product.tags.map((tagData: any) => {
                    const TagIcon = tagIcons[tagData.tag as keyof typeof tagIcons];
                    return (
                      <Badge 
                        key={tagData.tag} 
                        variant="outline"
                        className={`text-sm px-4 py-2 rounded-full font-semibold shadow-lg backdrop-blur-sm border-2 hover:scale-105 transition-transform duration-200 ${tagColors[tagData.tag as keyof typeof tagColors]}`}
                      >
                        <TagIcon className="w-4 h-4 mr-2" />
                        {tagData.tag.replace('_', ' ')}
                      </Badge>
                    );
                  })}
                </div>

                {/* Enhanced Price Section */}
                <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200/50">
                  <div className="flex items-center space-x-4 mb-2">
                    <span className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {formatCurrency(getCurrentPrice())}
                    </span>
                    {getCurrentPrice() < product.price && (
                      <div className="flex flex-col">
                        <span className="text-xl text-gray-500 line-through">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-sm font-semibold text-red-600">
                          Save {formatCurrency(product.price - getCurrentPrice())}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Discount Countdown */}
                  {timeLeft && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl"
                    >
                      <div className="flex items-center space-x-2 text-red-600 mb-2">
                        <Clock className="h-5 w-5" />
                        <span className="text-sm font-bold">⚡ Limited Time Offer - Sale ends in:</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Days', value: timeLeft.days },
                          { label: 'Hours', value: timeLeft.hours },
                          { label: 'Minutes', value: timeLeft.minutes },
                          { label: 'Seconds', value: timeLeft.seconds }
                        ].map((item) => (
                          <div key={item.label} className="text-center bg-white rounded-lg p-2 shadow-md">
                            <div className="text-2xl font-bold text-red-600">{item.value}</div>
                            <div className="text-xs text-gray-600 font-medium">{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Enhanced Stock Status */}
                <div className="mb-6">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${
                    product.stock > 0 
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                      : 'bg-gradient-to-r from-red-100 to-red-100 text-red-800 border border-red-200'
                  }`}>
                    <Package className="h-4 w-4" />
                    {product.stock > 0 ? `${product.stock} units available` : 'Out of stock'}
                  </div>
                </div>

                {/* Enhanced Voucher Application */}
                {user && user.role === 'CUSTOMER' && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200/50 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Percent className="h-5 w-5 text-blue-600" />
                      <h3 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Apply Voucher Code
                      </h3>
                    </div>
                    <div className="flex space-x-3">
                      <Input
                        placeholder="Enter voucher code for extra savings"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value)}
                        className="flex-1 rounded-xl border-2 border-blue-200 focus:border-blue-500 bg-white/80 backdrop-blur-sm"
                      />
                      <Button 
                        onClick={applyVoucher} 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl px-8 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Apply
                      </Button>
                    </div>
                    {appliedVoucher && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl"
                      >
                        <div className="flex items-center gap-2 text-green-700">
                          <Award className="h-4 w-4" />
                          <span className="font-semibold">Voucher Applied: {appliedVoucher.name}</span>
                        </div>
                        <span className="text-sm text-green-600 font-medium">
                          You save {formatCurrency(product.price * quantity - getCurrentPrice() * quantity)}! 🎉
                        </span>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Enhanced Quantity and Actions */}
                {user && user.role === 'CUSTOMER' && product.stock > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                      <span className="text-lg font-semibold text-gray-900">Quantity:</span>
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="rounded-full w-10 h-10 p-0 border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-center text-lg font-bold rounded-xl border-2 border-blue-200 focus:border-blue-500"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                          className="rounded-full w-10 h-10 p-0 border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button
                        onClick={handleAddToCart}
                        variant="outline"
                        disabled={addingToCart}
                        className="py-4 rounded-2xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      >
                        {addingToCart ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-5 w-5 mr-2" />
                        )}
                        {addingToCart ? 'Adding...' : 'Add to Cart'}
                      </Button>
                      <Button
                        onClick={handleBuyNow}
                        disabled={buyingNow}
                        className="py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden group"
                      >
                        {buyingNow ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <CreditCard className="h-5 w-5 mr-2" />
                        )}
                        <span className="relative z-10">{buyingNow ? 'Processing...' : 'Buy Now'}</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      </Button>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 backdrop-blur-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                        <div className="text-right">
                          <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {formatCurrency(getCurrentPrice() * quantity)}
                          </span>
                          {getCurrentPrice() < product.price && (
                            <div className="text-sm text-gray-600">
                              Was: <span className="line-through">{formatCurrency(product.price * quantity)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLike}
                    className={`rounded-full px-6 py-2 font-semibold transition-all duration-300 hover:scale-105 ${
                      isLiked 
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
                        : 'border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="rounded-full px-6 py-2 font-semibold border-gray-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 hover:scale-105"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  {user && (user.id === product.sellerId || user.role === 'ADMIN') && (
                    <Link href={`/seller/products/${product.id}/edit`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-full px-6 py-2 font-semibold border-gray-200 hover:border-green-200 hover:bg-green-50 hover:text-green-600 transition-all duration-300 hover:scale-105"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Enhanced Product Details Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden"
          >
            {/* Back to Products Button */}
            <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
              <Link href="/products">
                <Button 
                  variant="outline" 
                  className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to All Products
                </Button>
              </Link>
            </div>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200/50 rounded-none h-16">
                <TabsTrigger 
                  value="details" 
                  className="text-lg font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-2xl mx-2 my-2 transition-all duration-300 hover:scale-105"
                >
                  <Package className="h-5 w-5 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger 
                  value="seller" 
                  className="text-lg font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-2xl mx-2 my-2 transition-all duration-300 hover:scale-105"
                >
                  <User className="h-5 w-5 mr-2" />
                  Seller
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                  className="text-lg font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-2xl mx-2 my-2 transition-all duration-300 hover:scale-105"
                >
                  <Star className="h-5 w-5 mr-2" />
                  Reviews
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="text-lg font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-2xl mx-2 my-2 transition-all duration-300 hover:scale-105"
                >
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-0 p-8">
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
                      Product Specifications
                    </h3>
                    <p className="text-xl text-gray-600">Detailed information about this premium product</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200/50">
                        <div className="flex items-center gap-3 mb-3">
                          <Package className="h-6 w-6 text-blue-600" />
                          <span className="font-bold text-lg text-gray-900">Product Type</span>
                        </div>
                        <p className="text-gray-700 text-lg font-medium">{product.type.replace('_', ' ')}</p>
                      </div>

                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200/50">
                        <div className="flex items-center gap-3 mb-3">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                          <span className="font-bold text-lg text-gray-900">Stock Available</span>
                        </div>
                        <p className="text-gray-700 text-lg font-medium">{product.stock} units</p>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200/50">
                        <div className="flex items-center gap-3 mb-3">
                          <Calendar className="h-6 w-6 text-purple-600" />
                          <span className="font-bold text-lg text-gray-900">Date Added</span>
                        </div>
                        <p className="text-gray-700 text-lg font-medium">{new Date(product.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200/50">
                        <div className="flex items-center gap-3 mb-3">
                          <Shield className="h-6 w-6 text-orange-600" />
                          <span className="font-bold text-lg text-gray-900">Product ID</span>
                        </div>
                        <p className="text-gray-700 text-sm font-mono bg-white/80 rounded-lg px-3 py-2 border">{product.id}</p>
                      </div>

                      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-200/50">
                        <div className="flex items-center gap-3 mb-3">
                          <Eye className="h-6 w-6 text-cyan-600" />
                          <span className="font-bold text-lg text-gray-900">Product Views</span>
                        </div>
                        <p className="text-gray-700 text-lg font-medium">{product.views || 0} views</p>
                      </div>

                      {product.tags.length > 0 && (
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200/50">
                          <div className="flex items-center gap-3 mb-4">
                            <Award className="h-6 w-6 text-yellow-600" />
                            <span className="font-bold text-lg text-gray-900">Quality Tags</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {product.tags.map((tagData: any) => {
                              const TagIcon = tagIcons[tagData.tag as keyof typeof tagIcons];
                              return (
                                <Badge 
                                  key={tagData.tag} 
                                  className={`${tagColors[tagData.tag as keyof typeof tagColors]} text-sm px-3 py-2 rounded-full font-semibold shadow-md`}
                                >
                                  <TagIcon className="w-4 h-4 mr-2" />
                                  {tagData.tag.replace('_', ' ')}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {product.metaDescription && (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200/50 mt-8">
                      <div className="flex items-center gap-3 mb-4">
                        <MessageCircle className="h-6 w-6 text-gray-600" />
                        <span className="font-bold text-xl text-gray-900">Detailed Description</span>
                      </div>
                      <p className="text-gray-700 text-lg leading-relaxed">{product.metaDescription}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="seller" className="mt-0 p-8">
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
                      Meet the Seller
                    </h3>
                    <p className="text-xl text-gray-600">Learn about the trusted vendor behind this product</p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 border border-blue-200/50">
                    <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <Avatar className="h-24 w-24 border-4 border-white shadow-2xl">
                            <AvatarImage src={product.seller.avatar} alt={product.seller.name} />
                            <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                              {product.seller.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-2">
                            <Shield className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                            {product.seller.name}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className="bg-gradient-to-r from-blue-100 to-purple-100 border-blue-200 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold"
                          >
                            <Crown className="h-4 w-4 mr-2" />
                            {product.seller.role}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {product.seller.location && (
                            <div className="flex items-center space-x-3 p-4 bg-white/80 rounded-2xl border border-gray-200/50">
                              <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full">
                                <MapPin className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-600">Location</span>
                                <p className="font-semibold text-gray-900">{product.seller.location}</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-3 p-4 bg-white/80 rounded-2xl border border-gray-200/50">
                            <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full">
                              <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-600">Member Since</span>
                              <p className="font-semibold text-gray-900">{new Date(product.seller.createdAt).getFullYear()}</p>
                            </div>
                          </div>
                        </div>

                        {product.seller.tags.length > 0 && (
                          <div className="bg-white/80 rounded-2xl p-6 border border-gray-200/50">
                            <div className="flex items-center gap-2 mb-4">
                              <Award className="h-5 w-5 text-yellow-600" />
                              <span className="font-bold text-lg text-gray-900">Seller Badges</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {product.seller.tags.map((tagData: any) => {
                                const TagIcon = tagIcons[tagData.tag as keyof typeof tagIcons];
                                return (
                                  <Badge 
                                    key={tagData.tag} 
                                    className={`${tagColors[tagData.tag as keyof typeof tagColors]} text-sm px-4 py-2 rounded-full font-semibold shadow-lg hover:scale-105 transition-transform duration-200`}
                                  >
                                    <TagIcon className="w-4 h-4 mr-2" />
                                    {tagData.tag.replace('_', ' ')}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-200/50">
                      <div className="flex flex-wrap gap-4 justify-center">
                        <Link href={`/store/${product.seller.dashboardSlug || product.seller.id}`}>
                          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl px-8 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                            <Package className="h-5 w-5 mr-2" />
                            Visit Store
                          </Button>
                        </Link>
                        <ChatWidget 
                          participantId={product?.seller?.id} 
                          participantName={product?.seller?.name} 
                          participantAvatar={product?.seller?.avatar} 
                          productId={product?.id}
                          triggerButton={
                            <Button 
                              variant="outline" 
                              className="border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 font-bold rounded-2xl px-8 py-3 transition-all duration-300 hover:scale-105"
                            >
                              <MessageCircle className="h-5 w-5 mr-2" />
                              Start Chat
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-0 p-8">
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
                      Customer Reviews
                    </h3>
                    <p className="text-xl text-gray-600">See what others are saying about this product</p>
                  </div>

                  {/* Enhanced Review Summary */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-3xl p-8 border border-yellow-200/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4 mb-6">
                          <div className="text-6xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                            {product.averageRating || 0}
                          </div>
                          <div>
                            <div className="flex justify-center lg:justify-start mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-8 w-8 ${
                                    i < Math.floor(product.averageRating || 0)
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-gray-700 text-lg font-semibold">
                              Based on {product.reviews?.length || 0} reviews
                            </p>
                          </div>
                        </div>

                        {user && user.role === 'CUSTOMER' && (
                          <Button 
                            onClick={() => setShowReviewForm(true)} 
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl px-8 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                          >
                            <Star className="h-5 w-5 mr-2" />
                            Write a Review
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-bold text-lg text-gray-900 mb-4">Rating Breakdown</h4>
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = product.reviews?.filter((r: any) => r.rating === rating).length || 0;
                          const percentage = product.reviews?.length ? (count / product.reviews.length) * 100 : 0;
                          return (
                            <div key={rating} className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2 w-16">
                                <span className="text-sm font-semibold">{rating}</span>
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-700 w-12 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Reviews List */}
                  <div className="space-y-6">
                    {product.reviews?.length > 0 ? (
                      product.reviews.map((review: any, index: number) => (
                        <motion.div
                          key={review.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <div className="flex items-start space-x-6">
                            <div className="flex-shrink-0">
                              <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                                <AvatarImage src={review.user.avatar} alt={review.user.name} />
                                <AvatarFallback className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                  {review.user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                                <div>
                                  <h4 className="font-bold text-lg text-gray-900 mb-1">{review.user.name}</h4>
                                  <div className="flex items-center space-x-2">
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-5 w-5 ${
                                            i < review.rating
                                              ? 'text-yellow-400 fill-current'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-sm text-gray-600 font-medium">
                                      {new Date(review.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <p className="text-gray-700 text-lg leading-relaxed mb-4">{review.comment}</p>

                              {review.images && review.images.length > 0 && (
                                <div className="flex space-x-3 mb-4">
                                  {review.images.map((image: string, imageIndex: number) => (
                                    <div key={imageIndex} className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition-colors duration-200">
                                      <Image
                                        src={image}
                                        alt={`Review image ${imageIndex + 1}`}
                                        fill
                                        className="object-cover hover:scale-110 transition-transform duration-300"
                                        sizes="96px"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center space-x-6 text-sm">
                                <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200 p-2 rounded-xl hover:bg-blue-50">
                                  <ThumbsUp className="h-4 w-4" />
                                  <span className="font-medium">Helpful ({review.likes?.length || 0})</span>
                                </button>
                                <button className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors duration-200 p-2 rounded-xl hover:bg-green-50">
                                  <MessageCircle className="h-4 w-4" />
                                  <span className="font-medium">Reply</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-16">
                        <div className="relative mb-8">
                          <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-gray-400/20 rounded-full blur-xl"></div>
                          <MessageCircle className="h-20 w-20 text-gray-400 mx-auto relative z-10" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">No Reviews Yet</h3>
                        <p className="text-gray-600 text-lg mb-8">Be the first to share your experience with this product!</p>
                        {user && user.role === 'CUSTOMER' && (
                          <Button 
                            onClick={() => setShowReviewForm(true)} 
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl px-8 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                          >
                            <Star className="h-5 w-5 mr-2" />
                            Write First Review
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-0 p-8">
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
                      Product Analytics
                    </h3>
                    <p className="text-xl text-gray-600">Performance insights and engagement metrics</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full p-4 w-20 h-20 mx-auto mb-6 shadow-lg">
                          <Eye className="h-12 w-12 text-white" />
                        </div>
                        <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-2">
                          {(product.views || 0).toLocaleString()}
                        </div>
                        <div className="text-lg font-semibold text-blue-700">Total Views</div>
                        <div className="text-sm text-blue-600 mt-2">People interested</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 border border-green-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-full p-4 w-20 h-20 mx-auto mb-6 shadow-lg">
                          <ShoppingCart className="h-12 w-12 text-white" />
                        </div>
                        <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-2">
                          {(product.purchases || 0).toLocaleString()}
                        </div>
                        <div className="text-lg font-semibold text-green-700">Total Sales</div>
                        <div className="text-sm text-green-600 mt-2">Units sold</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-8 border border-red-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-full p-4 w-20 h-20 mx-auto mb-6 shadow-lg">
                          <Heart className="h-12 w-12 text-white" />
                        </div>
                        <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-2">
                          {(product.likes || 0).toLocaleString()}
                        </div>
                        <div className="text-lg font-semibold text-red-700">Favorites</div>
                        <div className="text-sm text-red-600 mt-2">Customer loves</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-3xl p-8 border border-yellow-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full p-4 w-20 h-20 mx-auto mb-6 shadow-lg">
                          <Star className="h-12 w-12 text-white" />
                        </div>
                        <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text text-transparent mb-2">
                          {(product.averageRating || 0).toFixed(1)}
                        </div>
                        <div className="text-lg font-semibold text-yellow-700">Avg Rating</div>
                        <div className="text-sm text-yellow-600 mt-2">Customer satisfaction</div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Analytics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-6 border border-purple-200/50">
                      <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-full p-3">
                          <TrendingUp className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-700">
                            {product.views && product.purchases ? ((product.purchases / product.views) * 100).toFixed(1) : 0}%
                          </div>
                          <div className="text-purple-600 font-semibold">Conversion Rate</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-3xl p-6 border border-cyan-200/50">
                      <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full p-3">
                          <MessageCircle className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-cyan-700">
                            {product.reviews?.length || 0}
                          </div>
                          <div className="text-cyan-600 font-semibold">Total Reviews</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-6 border border-orange-200/50">
                      <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-full p-3">
                          <Calendar className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-orange-700">
                            {Math.floor((new Date().getTime() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                          </div>
                          <div className="text-orange-600 font-semibold">Days Online</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Insights */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl p-8 border border-gray-200/50 mt-8">
                    <h4 className="text-2xl font-bold text-gray-900 mb-6 text-center">Performance Insights</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-md">
                          <span className="font-semibold text-gray-700">Engagement Score</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, ((product.likes || 0) + (product.views || 0) / 10) / 10)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-gray-600">
                              {Math.min(100, Math.floor(((product.likes || 0) + (product.views || 0) / 10) / 10))}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-md">
                          <span className="font-semibold text-gray-700">Customer Interest</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, (product.averageRating || 0) * 20)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-gray-600">
                              {Math.min(100, Math.floor((product.averageRating || 0) * 20))}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 shadow-md">
                        <h5 className="font-bold text-lg text-gray-900 mb-4">Quick Stats</h5>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Stock Level:</span>
                            <span className="font-semibold text-gray-900">{product.stock} units</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Price Range:</span>
                            <span className="font-semibold text-gray-900">Premium</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Category:</span>
                            <span className="font-semibold text-gray-900">{product.type.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className={`font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {product.stock > 0 ? 'Available' : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* More from this Store Section */}
          {storeProducts.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-16"
            >
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm px-8 py-4 rounded-full shadow-lg mb-6 border border-blue-200/50">
                  <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    More from {product.seller.name}
                  </span>
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
                  Discover More Products
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Explore other amazing products from this trusted seller
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {storeProducts.map((storeProduct: any, index: number) => (
                  <motion.div
                    key={storeProduct.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + (index * 0.1) }}
                  >
                    <Card className="group overflow-hidden transition-all duration-500 hover:shadow-2xl border-0 bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg hover:-translate-y-3 hover:rotate-1">
                      <div className="relative aspect-square overflow-hidden rounded-t-3xl bg-gradient-to-br from-gray-50 to-gray-100">
                        {storeProduct.images?.length > 0 ? (
                          <Image
                            src={storeProduct.images[0]}
                            alt={storeProduct.name}
                            fill
                            className="object-cover transition-all duration-700 group-hover:scale-125 group-hover:rotate-2"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <Package className="h-16 w-16 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                      </div>
                      
                      <CardContent className="p-6 bg-gradient-to-b from-white to-gray-50/50">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-gray-900 line-clamp-2 text-lg group-hover:text-blue-600 transition-colors duration-300">
                            {storeProduct.name}
                          </h3>
                          <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {formatCurrency(storeProduct.price)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge className={`text-xs px-3 py-1 rounded-full ${tagColors[storeProduct.type as keyof typeof tagColors]}`}>
                            {storeProduct.type.replace('_', ' ')}
                          </Badge>
                          {storeProduct.stock > 0 && (
                            <Badge variant="outline" className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border-green-200">
                              {storeProduct.stock} in stock
                            </Badge>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {user && user.role === 'CUSTOMER' && storeProduct.stock > 0 ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                onClick={() => handleAddToCartGeneric(storeProduct.id, 1)}
                                variant="outline"
                                size="sm"
                                className="text-xs font-semibold rounded-xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Cart
                              </Button>
                              <Button
                                onClick={() => handleDirectCheckout(storeProduct, 1)}
                                size="sm"
                                className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-300"
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Buy
                              </Button>
                            </div>
                            <Link href={`/product/${storeProduct.id}`}>
                              <Button className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg text-sm">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {storeProduct.stock === 0 && (
                              <Badge variant="destructive" className="w-full justify-center text-xs py-2 rounded-xl">
                                Out of Stock
                              </Badge>
                            )}
                            <Link href={`/product/${storeProduct.id}`}>
                              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="text-center mt-8">
                <Link href={`/store/${product.seller.dashboardSlug || product.seller.id}`}>
                  <Button 
                    variant="outline" 
                    className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 font-bold text-lg px-8 py-3 rounded-2xl transition-all duration-300 hover:scale-105"
                  >
                    Visit {product.seller.name}&apos;s Store
                  </Button>
                </Link>
              </div>
            </motion.section>
          )}

          {/* Related Products Section */}
          {relatedProducts.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-16"
            >
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600/10 to-blue-600/10 backdrop-blur-sm px-8 py-4 rounded-full shadow-lg mb-6 border border-purple-200/50">
                  <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    You Might Also Like
                  </span>
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-blue-800 bg-clip-text text-transparent mb-4">
                  Related Products
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Similar products that other customers also viewed
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((relatedProduct: any, index: number) => (
                  <motion.div
                    key={relatedProduct.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + (index * 0.1) }}
                  >
                    <Card className="group overflow-hidden transition-all duration-500 hover:shadow-2xl border-0 bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg hover:-translate-y-3">
                      <div className="relative aspect-square overflow-hidden rounded-t-3xl bg-gradient-to-br from-gray-50 to-gray-100">
                        {relatedProduct.images?.length > 0 ? (
                          <Image
                            src={relatedProduct.images[0]}
                            alt={relatedProduct.name}
                            fill
                            className="object-cover transition-all duration-700 group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <Package className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                      </div>
                      
                      <CardContent className="p-4">
                        <h3 className="font-bold text-gray-900 line-clamp-2 text-sm mb-2 group-hover:text-purple-600 transition-colors duration-300">
                          {relatedProduct.name}
                        </h3>
                        <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent block mb-3">
                          {formatCurrency(relatedProduct.price)}
                        </span>

                        {/* Stock Badge */}
                        {relatedProduct.stock > 0 ? (
                          <Badge variant="outline" className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border-green-200 mb-3">
                            {relatedProduct.stock} in stock
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs px-2 py-1 rounded-full mb-3">
                            Out of stock
                          </Badge>
                        )}

                        {/* Action Buttons */}
                        {user && user.role === 'CUSTOMER' && relatedProduct.stock > 0 ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1">
                              <Button
                                onClick={() => handleAddToCartGeneric(relatedProduct.id, 1)}
                                variant="outline"
                                size="sm"
                                className="text-xs font-semibold rounded-lg border border-purple-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300"
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Cart
                              </Button>
                              <Button
                                onClick={() => handleDirectCheckout(relatedProduct, 1)}
                                size="sm"
                                className="text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-300"
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Buy
                              </Button>
                            </div>
                            <Link href={`/product/${relatedProduct.id}`}>
                              <Button 
                                size="sm" 
                                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 text-xs"
                              >
                                View Details
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {relatedProduct.stock === 0 && (
                              <div className="text-center py-2">
                                <span className="text-xs text-red-600 font-medium">Currently unavailable</span>
                              </div>
                            )}
                            <Link href={`/product/${relatedProduct.id}`}>
                              <Button 
                                size="sm" 
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 text-xs"
                              >
                                View Details
                              </Button>
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="text-center mt-8">
                <Link href="/products">
                  <Button 
                    variant="outline" 
                    className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 hover:border-purple-500 hover:bg-purple-50 font-bold text-lg px-8 py-3 rounded-2xl transition-all duration-300 hover:scale-105"
                  >
                    Explore All Products
                  </Button>
                </Link>
              </div>
            </motion.section>
          )}
        </motion.div>
      </div>

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rating</label>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-6 w-6 cursor-pointer ${
                      i < reviewData.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                    onClick={() => setReviewData({ ...reviewData, rating: i + 1 })}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Comment</label>
              <Textarea
                value={reviewData.comment}
                onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                placeholder="Share your thoughts about this product..."
                rows={4}
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={() => setShowReviewForm(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={submitReview} className="flex-1">
                Submit Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Modal */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Product Image</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-auto max-h-[80vh]">
            <Image
              src={product.images[selectedImageIndex]}
              alt={product.name}
              width={800}
              height={600}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Sticky Mobile Actions */}
      {user && user.role === 'CUSTOMER' && product.stock > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t-2 border-blue-200 p-4 md:hidden z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{quantity}x</span> {product.name}
            </div>
            <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {formatCurrency(getCurrentPrice() * quantity)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleAddToCart}
              variant="outline"
              disabled={addingToCart}
              className="flex-1 py-3 rounded-2xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 font-bold transition-all duration-300"
            >
              {addingToCart ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4 mr-2" />
              )}
              Cart
            </Button>
            <Button
              onClick={handleBuyNow}
              disabled={buyingNow}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold transition-all duration-300 shadow-lg"
            >
              {buyingNow ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Buy Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}