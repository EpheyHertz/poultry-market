'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import ChatWidget from '@/components/chat/chat-widget';
import { formatCurrency } from '@/lib/invoice';

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

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
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
  }, [params.slug]);

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
      const response = await fetch(`/api/products/${params.slug}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);

        // Update view count
        await fetch(`/api/products/${params.slug}/view`, { method: 'POST' });
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

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }

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
        toast.error('Failed to add to cart');
      }
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error('Please login to purchase');
      return;
    }

    // Redirect to checkout with this product
    const checkoutData = {
      items: [{
        productId: product.id,
        quantity,
        price: getCurrentPrice()
      }],
      voucherCode: appliedVoucher?.code
    };

    localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    window.location.href = '/customer/checkout';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Meta Tags */}
      <head>
        <title>{product.metaTitle || product.name}</title>
        <meta name="description" content={product.metaDescription || product.description} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.images[0]} />
        <meta property="og:url" content={window.location.href} />
      </head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Product Images */}
            <div className="space-y-4">
              <motion.div
                className="aspect-square bg-white rounded-lg overflow-hidden relative group cursor-pointer"
                onClick={() => setIsZoomed(true)}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={product.images[selectedImageIndex] || '/placeholder.jpg'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Discount Badge */}
                {getDiscountPercentage() > 0 && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-red-500 text-white">
                      {getDiscountPercentage()}% OFF
                    </Badge>
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
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) => 
                          prev === product.images.length - 1 ? 0 : prev + 1
                        );
                      }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </motion.div>

              {/* Thumbnail Gallery */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((image: string, index: number) => (
                    <motion.div
                      key={index}
                      className={`aspect-square bg-white rounded-lg overflow-hidden cursor-pointer border-2 ${
                        selectedImageIndex === index ? 'border-green-500' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedImageIndex(index)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                <p className="text-gray-600 mb-4">{product.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={`${tagColors[product.type as keyof typeof tagColors]} text-xs`}>
                    {product.type.replace('_', ' ')}
                  </Badge>
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

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl font-bold text-green-600">
                      {formatCurrency(getCurrentPrice())}
                    </span>
                    {getCurrentPrice() < product.price && (
                      <span className="text-lg text-gray-500 line-through">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>

                  {/* Discount Countdown */}
                  {timeLeft && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-2 text-red-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Sale ends in:</span>
                      </div>
                      <div className="flex space-x-2 mt-1">
                        <span className="text-lg font-bold">{timeLeft.days}d</span>
                        <span className="text-lg font-bold">{timeLeft.hours}h</span>
                        <span className="text-lg font-bold">{timeLeft.minutes}m</span>
                        <span className="text-lg font-bold">{timeLeft.seconds}s</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Stock Status */}
                <div className="mb-4">
                  <Badge className={product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                  </Badge>
                </div>

                {/* Voucher Application */}
                {user && user.role === 'CUSTOMER' && (
                  <div className="border rounded-lg p-4 mb-4">
                    <h3 className="font-semibold mb-2">Apply Voucher</h3>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter voucher code"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={applyVoucher} variant="outline">
                        Apply
                      </Button>
                    </div>
                    {appliedVoucher && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                        Voucher applied: {appliedVoucher.name} - Save {formatCurrency(product.price * quantity - getCurrentPrice() * quantity)}
                      </div>
                    )}
                  </div>
                )}

                {/* Quantity and Actions */}
                {user && user.role === 'CUSTOMER' && product.stock > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">Quantity:</span>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        onClick={handleAddToCart}
                        variant="outline"
                        className="flex-1"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                      <Button
                        onClick={handleBuyNow}
                        className="flex-1"
                      >
                        Buy Now
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLike}
                    className={isLiked ? 'text-red-500' : ''}
                  >
                    <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                  {user && (user.id === product.sellerId || user.role === 'ADMIN') && (
                    <Link href={`/admin/products/${product.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  )}
                  {user && user.role === 'ADMIN' && (
                    <Button variant="outline" size="sm" className="text-red-600">
                      <Flag className="h-4 w-4 mr-1" />
                      Flag
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="seller">Seller Info</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Type:</span>
                        <p className="text-gray-600">{product.type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <span className="font-medium">Stock:</span>
                        <p className="text-gray-600">{product.stock} units</p>
                      </div>
                      <div>
                        <span className="font-medium">Added:</span>
                        <p className="text-gray-600">{new Date(product.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">SKU:</span>
                        <p className="text-gray-600">{product.id}</p>
                      </div>
                    </div>

                    {product.metaDescription && (
                      <div>
                        <span className="font-medium">Description:</span>
                        <p className="text-gray-600 mt-1">{product.metaDescription}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seller" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Seller Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={product.seller.avatar} alt={product.seller.name} />
                        <AvatarFallback>{product.seller.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{product.seller.name}</h3>
                        <Badge variant="outline" className="mb-2">
                          {product.seller.role}
                        </Badge>
                        {product.seller.location && (
                          <div className="flex items-center space-x-1 text-gray-600 mb-2">
                            <MapPin className="h-4 w-4" />
                            <span>{product.seller.location}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Member since {new Date(product.seller.createdAt).getFullYear()}</span>
                        </div>

                        {product.seller.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {product.seller.tags.map((tagData: any) => {
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
                        )}

                        <div className="mt-4">
                          <Link href={`/store/${product.seller.dashboardSlug || product.seller.id}`}>
                            <Button variant="outline" size="sm">
                              Visit Store
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-6">
                  {/* Review Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-yellow-500 mb-2">
                            {product.averageRating || 0}
                          </div>
                          <div className="flex justify-center mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-5 w-5 ${
                                  i < Math.floor(product.averageRating || 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-gray-600">{product.reviews?.length || 0} reviews</p>
                        </div>

                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const count = product.reviews?.filter((r: any) => r.rating === rating).length || 0;
                            const percentage = product.reviews?.length ? (count / product.reviews.length) * 100 : 0;
                            return (
                              <div key={rating} className="flex items-center space-x-2">
                                <span className="text-sm w-8">{rating}★</span>
                                <Progress value={percentage} className="flex-1" />
                                <span className="text-sm text-gray-600 w-8">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {user && user.role === 'CUSTOMER' && (
                        <div className="mt-6 pt-6 border-t">
                          <Button onClick={() => setShowReviewForm(true)} className="w-full">
                            Write a Review
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {product.reviews?.map((review: any) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-lg border"
                      >
                        <div className="flex items-start space-x-4">
                          <Avatar>
                            <AvatarImage src={review.user.avatar} alt={review.user.name} />
                            <AvatarFallback>{review.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-semibold">{review.user.name}</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-gray-600 mb-3">{review.comment}</p>

                            {review.images && review.images.length > 0 && (
                              <div className="flex space-x-2 mb-3">
                                {review.images.map((image: string, index: number) => (
                                  <img
                                    key={index}
                                    src={image}
                                    alt={`Review image ${index + 1}`}
                                    className="h-20 w-20 object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                            )}

                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                              <button className="flex items-center space-x-1 hover:text-blue-600">
                                <ThumbsUp className="h-4 w-4" />
                                <span>Helpful ({review.likes?.length || 0})</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <Eye className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{product.views || 0}</div>
                        <div className="text-sm text-gray-600">Views</div>
                      </div>
                      <div className="text-center">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold">{product.purchases || 0}</div>
                        <div className="text-sm text-gray-600">Purchases</div>
                      </div>
                      <div className="text-center">
                        <Heart className="h-8 w-8 mx-auto mb-2 text-red-600" />
                        <div className="text-2xl font-bold">{product.likes || 0}</div>
                        <div className="text-sm text-gray-600">Likes</div>
                      </div>
                      <div className="text-center">
                        <Star className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                        <div className="text-2xl font-bold">{product.averageRating || 0}</div>
                        <div className="text-sm text-gray-600">Rating</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
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
          <img
            src={product.images[selectedImageIndex]}
            alt={product.name}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
        </DialogContent>
      </Dialog>

      {/* Sticky Mobile Cart */}
      {user && user.role === 'CUSTOMER' && product.stock > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden z-50">
          <div className="flex space-x-2">
            <Button
              onClick={handleAddToCart}
              variant="outline"
              className="flex-1"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
            <Button
              onClick={handleBuyNow}
              className="flex-1"
            >
              Buy Now - {formatCurrency(getCurrentPrice())}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}