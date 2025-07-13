"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, Phone, Globe, Star, Package, Calendar, Mail, MessageCircle, ExternalLink, Heart } from 'lucide-react'
import Link from 'next/link'
import ChatWidget from '@/components/chat/chat-widget'
import { Skeleton } from '@/components/ui/skeleton'
import { useParams } from 'next/navigation'

interface StorePageProps {
  params: {
    slug: string
  }
}

export default function StorePage() {
  const params = useParams<StorePageProps['params']>()
  const slug = typeof params?.slug === 'string' ? params.slug : ''
  const router = useRouter()
  const [storeOwner, setStoreOwner] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/stores/${slug}`)
        if (!response.ok) {
          throw new Error('Failed to fetch store data')
        }
        const data = await response.json()
        setStoreOwner(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchStoreData()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
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
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-48 w-full mb-4" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-10 w-full" />
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
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !storeOwner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Store Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error || 'The store you are looking for does not exist.'}</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate store stats
  const totalProducts = storeOwner.products?.length || 0
  const totalFollowers = storeOwner.followers?.length || 0
  const allProductReviews = storeOwner.products?.flatMap((product: any) => 
    product.reviews?.map((review: any) => ({
      ...review,
      productId: product.id,
      productName: product.name,
    })) || []
  ) || []
  const totalReviews = allProductReviews.length
  const averageRating = totalReviews > 0 
    ? allProductReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / totalReviews
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                <AvatarImage src={storeOwner.avatar || ''} alt={storeOwner.name} />
                <AvatarFallback className="text-3xl font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {storeOwner.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{storeOwner.name}</h1>
                  <Badge 
                    variant={storeOwner.role === 'COMPANY' ? 'default' : 'secondary'} 
                    className="mt-2"
                  >
                    {storeOwner.role === 'COMPANY' ? 'Verified Business' : 'Independent Seller'}
                  </Badge>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Heart className="h-4 w-4" />
                    Follow ({totalFollowers})
                  </Button>
                  <ChatWidget
                    participantId={storeOwner.id}
                    participantName={storeOwner.name}
                    participantAvatar={storeOwner.avatar || ''}
                    triggerButton={
                      <Button size="sm" className="gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Message
                      </Button>
                    }
                  />
                </div>
              </div>

              {/* Store Stats */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span>{totalProducts} Products</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span>{averageRating.toFixed(1)} Rating ({totalReviews})</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span>Since {new Date(storeOwner.createdAt).getFullYear()}</span>
                </div>
              </div>

              {/* Store Tags */}
              {storeOwner.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {storeOwner.tags.map((tagData: any) => (
                    <Badge 
                      key={tagData.tag} 
                      variant="outline" 
                      className="text-xs px-2 py-1 bg-gray-50 hover:bg-gray-100"
                    >
                      {tagData.tag.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Store Info */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {storeOwner.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{storeOwner.location}</span>
                  </div>
                )}
                {storeOwner.phone && (
                  <a 
                    href={`tel:${storeOwner.phone}`} 
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{storeOwner.phone}</span>
                  </a>
                )}
                {storeOwner.website && (
                  <a 
                    href={storeOwner.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Visit Website</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Products */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Available Products</h2>
              <div className="text-sm text-gray-500">
                Showing {totalProducts} {totalProducts === 1 ? 'item' : 'items'}
              </div>
            </div>

            {totalProducts === 0 ? (
              <Card className="bg-gray-50">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
                  <p className="text-gray-500 max-w-md">
                    This store hasn't listed any products yet. Check back later or contact the seller for more information.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {storeOwner.products.map((product: any) => {
                  const productRating = product.reviews?.length > 0
                    ? product.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / product.reviews.length
                    : 0

                  return (
                    <Card key={product.id} className="group overflow-hidden transition-all hover:shadow-md">
                      <div className="relative aspect-square overflow-hidden">
                        {product.images?.length > 0 ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2">
                          <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900 line-clamp-2">
                            {product.name}
                          </h3>
                          <span className="text-lg font-bold text-green-600 whitespace-nowrap">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>

                        {product.reviews?.length > 0 && (
                          <div className="flex items-center gap-1 mb-3">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-gray-600">
                              {productRating.toFixed(1)} ({product.reviews.length})
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="outline" className="text-xs">
                            {product.type.replace('_', ' ')}
                          </Badge>
                        </div>

                        <Link href={`/product/${product.id}`}>
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Store Info Sidebar */}
          <div className="space-y-6">
            {/* Store Description */}
            {storeOwner.bio && (
              <Card>
                <CardHeader>
                  <CardTitle>About This Store</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 whitespace-pre-line">{storeOwner.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Recent Reviews */}
            {allProductReviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Reviews</CardTitle>
                  <CardDescription>
                    What buyers are saying about products from this store
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {allProductReviews.slice(0, 3).map((review: any) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-start gap-3 mb-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.user.avatar || ''} alt={review.user.name} />
                          <AvatarFallback className="text-sm">
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
                                  className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Reviewed {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{review.comment}</p>
                      <Link 
                        href={`/product/${review.productId}`} 
                        className="text-xs text-blue-600 hover:underline inline-flex items-center"
                      >
                        View product: {review.productName}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </div>
                  ))}
                  {allProductReviews.length > 3 && (
                    <Button variant="ghost" className="w-full text-sm">
                      View All Reviews
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Seller */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Seller</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {storeOwner.phone && (
                  <Button variant="outline" className="w-full justify-start gap-3">
                    <Phone className="h-4 w-4" />
                    <span>Call {storeOwner.name}</span>
                  </Button>
                )}
                {storeOwner.email && (
                  <Button variant="outline" className="w-full justify-start gap-3">
                    <Mail className="h-4 w-4" />
                    <span>Email {storeOwner.name}</span>
                  </Button>
                )}
                <ChatWidget
                  participantId={storeOwner.id}
                  participantName={storeOwner.name}
                  participantAvatar={storeOwner.avatar || ''}
                  triggerButton={
                    <Button className="w-full gap-3">
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat with Seller</span>
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}