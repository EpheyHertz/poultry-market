'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Phone, Globe, Star, Package, Calendar, Mail, MessageCircle, ExternalLink, Heart, Share2, Copy, Facebook, Twitter, Linkedin, Shield, Verified, Award, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import ChatWidget from '@/components/chat/chat-widget';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import { toast } from 'sonner';

interface StorePageProps {
  params: {
    slug: string;
  };
}

function StoreContent() {
  const params = useParams<StorePageProps['params']>();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const router = useRouter();
  const [storeOwner, setStoreOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Calculate store stats
  const totalProducts = storeOwner?.stats?.totalProducts || storeOwner?.products?.length || 0;
  const totalFollowers = storeOwner?.stats?.totalFollowers || storeOwner?.followers?.length || 0;
  const allProductReviews = storeOwner?.allProductReviews || storeOwner?.products?.flatMap((product: any) => 
    product.reviews?.map((review: any) => ({
      ...review,
      productId: product.id,
      productName: product.name,
    })) || []
  ) || [];
  const totalReviews = storeOwner?.stats?.totalReviews || allProductReviews.length;
  const averageRating = storeOwner?.stats?.averageRating || (totalReviews > 0 
    ? allProductReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / totalReviews
    : 0);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = storeOwner ? `Check out ${storeOwner.name} on PoultryMarket Kenya` : '';
  const shareDescription = storeOwner ? `Discover quality poultry products from ${storeOwner.name}. ${totalProducts} products available with ${averageRating.toFixed(1)} star rating.` : '';

  const handleShare = async (platform?: string) => {
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
        setShowShareModal(false);
      } catch (err) {
        toast.error('Failed to copy link');
      }
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else {
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareDescription,
            url: shareUrl,
          });
        } catch (err) {
          setShowShareModal(true);
        }
      } else {
        setShowShareModal(true);
      }
    }
  };

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true);
        // const storeId=slug
        const response = await fetch(`/api/stores/${slug}`);
        if (!response.ok) {
          throw new Error('Failed to fetch store data');
        }
        const data = await response.json();
        setStoreOwner(data);
        setIsFollowing(data.isFollowing || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [slug]);

  const handleFollow = async () => {
    try {
      const response = await fetch(`/api/stores/${storeOwner.id}/follow`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.following);
        toast.success(data.message || (data.following ? 'Following store' : 'Unfollowed store'));
        
        // Update follower count in the store data
        if (storeOwner.stats) {
          setStoreOwner(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              totalFollowers: prev.stats.totalFollowers + (data.following ? 1 : -1)
            }
          }));
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update follow status');
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-start gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-0">
                      <Skeleton className="h-48 w-full" />
                      <div className="p-4">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-4" />
                        <Skeleton className="h-10 w-full rounded-md" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6 mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full rounded-md" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !storeOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Store Not Found</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-6 text-center">
              {error || 'The store you are looking for does not exist.'}
            </p>
            <Button onClick={() => router.push('/')} className="w-full max-w-xs">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50">
      {/* Hero Background Pattern */}
      <div className="absolute inset-0 bg-grid-gray-100/50 opacity-40"></div>
      
      {/* Store Header */}
      <section className="relative bg-gradient-to-r from-white via-blue-50 to-purple-50 border-b shadow-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-10 items-center lg:items-start">
            <div className="flex-shrink-0 animate-in fade-in slide-in-from-left-5 duration-700">
              <div className="relative">
                <Avatar className="h-40 w-40 border-4 border-white shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 ring-4 ring-blue-100">
                  <AvatarImage src={storeOwner.avatar || ''} alt={storeOwner.name} />
                  <AvatarFallback className="text-5xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                    {storeOwner.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {storeOwner.role === 'COMPANY' && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg animate-bounce">
                    <Verified className="h-5 w-5" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 w-full text-center lg:text-left animate-in fade-in slide-in-from-right-5 duration-700 delay-150">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                <div>
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                    <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
                      {storeOwner.name}
                    </h1>
                    {storeOwner.role === 'COMPANY' && (
                      <Shield className="h-8 w-8 text-blue-600 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                    <Badge 
                      variant={storeOwner.role === 'COMPANY' ? 'default' : 'secondary'} 
                      className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 animate-in fade-in scale-in-95 duration-500 delay-500"
                    >
                      {storeOwner.role === 'COMPANY' ? '✓ Verified Business' : 'Independent Seller'}
                    </Badge>
                    <Award className="h-5 w-5 text-yellow-500" />
                  </div>
                  <p className="text-gray-600 text-lg max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500 delay-600">
                    {storeOwner.bio?.substring(0, 120)}...
                  </p>
                </div>

                <div className="flex flex-wrap justify-center lg:justify-end gap-3 animate-in fade-in slide-in-from-top-3 duration-500 delay-700">
                  <Button 
                    variant={isFollowing ? "default" : "outline"} 
                    size="lg" 
                    className="gap-2 font-semibold hover:scale-105 transition-all duration-200 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white border-0"
                    onClick={handleFollow}
                  >
                    <Heart className={`h-5 w-5 transition-all duration-200 ${isFollowing ? 'fill-white' : ''}`} />
                    {isFollowing ? 'Following' : 'Follow'} ({totalFollowers})
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="gap-2 font-semibold hover:scale-105 transition-all duration-200 bg-white/80 backdrop-blur-sm"
                    onClick={() => handleShare()}
                  >
                    <Share2 className="h-5 w-5" />
                    Share Store
                  </Button>
                  
                  <ChatWidget
                    participantId={storeOwner.id}
                    participantName={storeOwner.name}
                    participantAvatar={storeOwner.avatar || ''}
                    triggerButton={
                      <Button size="lg" className="gap-2 font-semibold hover:scale-105 transition-all duration-200 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0">
                        <MessageCircle className="h-5 w-5" />
                        Message Seller
                      </Button>
                    }
                  />
                </div>
              </div>

              {/* Enhanced Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-600">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
                  <div className="text-sm text-gray-600">Products</div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <Star className="h-6 w-6 text-yellow-500 fill-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Rating</div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <Heart className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{totalFollowers}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 text-center border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{new Date(storeOwner.createdAt).getFullYear()}</div>
                  <div className="text-sm text-gray-600">Since</div>
                </div>
              </div>
              {/* Tags & Contact Info */}
              {storeOwner.tags?.length > 0 && (
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-800">
                  {storeOwner.tags.slice(0, 6).map((tagData: any, index: number) => (
                    <Badge 
                      key={tagData.tag} 
                      variant="outline" 
                      className="text-xs px-3 py-1 bg-white/60 backdrop-blur-sm hover:bg-white/80 border-gray-300 rounded-full hover:scale-105 transition-all duration-200 shadow-sm"
                      style={{ animationDelay: `${900 + (index * 100)}ms` }}
                    >
                      {tagData.tag.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-base text-gray-700 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-1000">
                {storeOwner.location && (
                  <div className="flex items-center gap-2 hover:text-blue-600 transition-colors duration-200">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">{storeOwner.location}</span>
                  </div>
                )}
                {storeOwner.phone && (
                  <a 
                    href={`tel:${storeOwner.phone}`} 
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:scale-105 transition-all duration-200 font-medium"
                  >
                    <Phone className="h-5 w-5" />
                    <span>{storeOwner.phone}</span>
                  </a>
                )}
                {storeOwner.website && (
                  <a 
                    href={storeOwner.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:scale-105 transition-all duration-200 font-medium"
                  >
                    <Globe className="h-5 w-5" />
                    <span>Visit Website</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-90 duration-300">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold">Share Store</CardTitle>
              <CardDescription>Share {storeOwner.name} with others</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 gap-2 hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => handleShare('facebook')}
                >
                  <Facebook className="h-5 w-5 text-blue-600" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 gap-2 hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => handleShare('twitter')}
                >
                  <Twitter className="h-5 w-5 text-blue-400" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 gap-2 hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => handleShare('linkedin')}
                >
                  <Linkedin className="h-5 w-5 text-blue-700" />
                  LinkedIn
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 font-semibold"
                onClick={() => handleShare('copy')}
              >
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowShareModal(false)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Store Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Store Info Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Store Description */}
            {storeOwner.bio && (
              <Card className="border-gray-200 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all animate-in fade-in slide-in-from-left-5 duration-700 delay-300">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">About This Store</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-line text-base">{storeOwner.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Recent Reviews */}
            {allProductReviews.length > 0 && (
              <Card className="border-gray-200 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all animate-in fade-in slide-in-from-left-5 duration-700 delay-500">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Customer Reviews</CardTitle>
                  <CardDescription className="text-base text-gray-500">
                    What buyers are saying about products from this store
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {allProductReviews.slice(0, 3).map((review: any, index: number) => (
                    <div key={review.id} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0 animate-in fade-in slide-in-from-bottom-3 duration-500" style={{ animationDelay: `${600 + (index * 100)}ms` }}>
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-10 w-10 hover:scale-110 transition-transform duration-200">
                          <AvatarImage src={review.user.avatar || ''} alt={review.user.name} />
                          <AvatarFallback className="text-sm bg-gray-100">
                            {review.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{review.user.name}</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 transition-colors duration-200 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Reviewed {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-base text-gray-700 mb-2">{review.comment}</p>
                      <Link 
                        href={`/product/${review.productId}`} 
                        className="text-xs text-primary hover:underline inline-flex items-center hover:scale-105 transition-all duration-200"
                      >
                        View product: {review.productName}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </div>
                  ))}
                  {allProductReviews.length > 3 && (
                    <Button variant="ghost" className="w-full text-sm text-gray-600 hover:text-gray-900 font-semibold rounded-full hover:scale-105 transition-all duration-200">
                      View All Reviews
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Seller */}
            <Card className="border-gray-200 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all animate-in fade-in slide-in-from-left-5 duration-700 delay-700">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Contact Seller</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {storeOwner.phone && (
                  <Button variant="outline" className="w-full justify-start gap-3 bg-gray-50 hover:bg-gray-100 font-semibold rounded-full hover:scale-105 transition-all duration-200">
                    <Phone className="h-4 w-4" />
                    <span>Call {storeOwner.name}</span>
                  </Button>
                )}
                {storeOwner.email && (
                  <Button variant="outline" className="w-full justify-start gap-3 bg-gray-50 hover:bg-gray-100 font-semibold rounded-full hover:scale-105 transition-all duration-200">
                    <Mail className="h-4 w-4" />
                    <span>Email {storeOwner.name}</span>
                  </Button>
                )}
                <ChatWidget
                  participantId={storeOwner.id}
                  participantName={storeOwner.name}
                  participantAvatar={storeOwner.avatar || ''}
                  triggerButton={
                    <Button className="w-full gap-3 font-semibold rounded-full hover:scale-105 transition-all duration-200">
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat with Seller</span>
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          </div>

          {/* Store Statistics and Quick Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-md hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
                <CardContent className="p-6 text-center">
                  <Package className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-gray-900">{totalProducts}</h3>
                  <p className="text-sm text-gray-600">Total Products</p>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-md hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
                <CardContent className="p-6 text-center">
                  <Star className="h-8 w-8 text-yellow-500 fill-yellow-500 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</h3>
                  <p className="text-sm text-gray-600">Average Rating</p>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-md hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5 duration-700 delay-400">
                <CardContent className="p-6 text-center">
                  <Heart className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-gray-900">{totalFollowers}</h3>
                  <p className="text-sm text-gray-600">Followers</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section - Enhanced & Restyled */}
      <section className="relative bg-gradient-to-b from-gray-50 via-white to-gray-50 py-24 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-400/5 rounded-full blur-2xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm px-8 py-4 rounded-full shadow-lg mb-8 border border-blue-200/50">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
                <Package className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Premium Collection
              </span>
            </div>
            
            <h2 className="text-6xl font-extrabold text-gray-900 tracking-tight mb-8 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                Featured Products
              </span>
            </h2>
            
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
              Discover our carefully curated selection of premium poultry products, 
              <span className="text-blue-600 font-semibold"> sourced with care</span> and 
              <span className="text-purple-600 font-semibold"> delivered with excellence</span>
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mt-10">
              <div className="flex items-center gap-3 text-lg font-semibold bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <span className="text-gray-700">
                  {totalProducts} Premium {totalProducts === 1 ? 'Product' : 'Products'}
                </span>
              </div>
              
              {averageRating > 0 && (
                <div className="flex items-center gap-3 text-lg font-semibold bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                  <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                  <span className="text-gray-700">
                    {averageRating.toFixed(1)} Star Rating
                  </span>
                </div>
              )}
            </div>
            
            {/* Go to Products Button */}
            <div className="flex justify-center mt-12 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
              <Link href="/products">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-500 hover:scale-105 hover:shadow-2xl border-0 shadow-xl px-12 py-4 text-lg relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Package className="h-6 w-6" />
                    Explore All Products
                    <TrendingUp className="h-6 w-6 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </Button>
              </Link>
            </div>
          </div>

          {totalProducts === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl max-w-2xl mx-auto animate-in fade-in scale-in-95 duration-700 delay-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
                  <Package className="h-20 w-20 text-gray-400 relative z-10" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  No products available
                </h3>
                <p className="text-gray-600 max-w-md text-lg leading-relaxed">
                  This store hasn&apos;t listed any products yet. Check back later or contact the seller for more information.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-xl"></div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
                {storeOwner.products.map((product: any, index: number) => {
                  const productRating = product.reviews?.length > 0
                    ? product.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / product.reviews.length
                    : 0;

                  return (
                    <Card 
                      key={product.id} 
                      className="group overflow-hidden transition-all duration-500 hover:shadow-2xl border-0 bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg hover:-translate-y-3 hover:rotate-1 animate-in fade-in slide-in-from-bottom-8"
                      style={{ animationDelay: `${300 + (index * 100)}ms` }}
                    >
                      <div className="relative aspect-square overflow-hidden rounded-t-3xl bg-gradient-to-br from-gray-50 to-gray-100">
                        {/* Decorative gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
                        
                        {product.images?.length > 0 ? (
                          <Image 
                            src={product.images[0]} 
                            alt={product.name}
                            fill
                            className="object-cover transition-all duration-700 group-hover:scale-125 group-hover:rotate-2"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-500">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-lg"></div>
                              <Package className="h-16 w-16 text-gray-400 group-hover:scale-125 group-hover:text-gray-500 transition-all duration-500 relative z-10" />
                            </div>
                          </div>
                        )}
                        
                        {/* Enhanced stock badge */}
                        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform -translate-y-2 group-hover:translate-y-0">
                          <Badge 
                            variant={product.stock > 0 ? 'default' : 'destructive'} 
                            className="text-xs px-4 py-2 rounded-full shadow-xl backdrop-blur-sm bg-white/90 border-0 font-semibold"
                          >
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </Badge>
                        </div>
                        
                        {/* Premium overlay effect */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-t-3xl" />
                        
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-t-3xl"></div>
                      </div>
                      
                      <CardContent className="p-6 bg-gradient-to-b from-white to-gray-50/50">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-gray-900 line-clamp-2 text-lg group-hover:text-blue-600 transition-colors duration-300 leading-tight">
                            {product.name}
                          </h3>
                          <div className="text-right">
                            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300 inline-block">
                              KES {product.price.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {product.reviews?.length > 0 && (
                          <div className="flex items-center gap-2 mb-4 p-2 bg-yellow-50/50 rounded-lg border border-yellow-100">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${i < Math.floor(productRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} transition-colors duration-200`} 
                                />
                              ))}
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                              {productRating.toFixed(1)} ({product.reviews.length} reviews)
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mb-6">
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700 rounded-full hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 transition-all duration-300 font-medium px-3 py-1"
                          >
                            {product.type.replace('_', ' ')}
                          </Badge>
                        </div>

                        <Link href={`/product/${product.id}`} className="block">
                          <Button 
                            variant="outline" 
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-xl border-0 shadow-lg hover:shadow-2xl transform-gpu py-3 text-base relative overflow-hidden"
                          >
                            <span className="relative z-10">View Details</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading store details...</p>
        </div>
      </div>
    }>
      <StoreContent />
    </Suspense>
  );
}