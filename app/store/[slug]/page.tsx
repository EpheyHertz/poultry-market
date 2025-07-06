import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, Phone, Globe, Star, Package, Calendar, Users, Heart } from 'lucide-react'
import Link from 'next/link'
import ChatWidget  from '@/components/chat/chat-widget';
import { MessageCircle } from 'lucide-react';

interface StorePageProps {
  params: {
    slug: string
  }
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params

  const storeOwner = await prisma.user.findFirst({
    where: {
      OR: [
        { dashboardSlug: slug },
        { id: slug }
      ],
      role: { in: ['SELLER', 'COMPANY'] },
      isActive: true
    },
    include: {
      products: {
        where: { isActive: true },
        include: {
          tags: true,
          reviews: {
            select: {
              id: true,
              rating: true,
              comment: true, // optional
              createdAt: true, // optional
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true, // or whatever field represents the reviewer
                },
              },
            },
            orderBy: { createdAt: 'desc' }
          },
          // analytics: {
          //   orderBy: { date: 'desc' },
          //   take: 1
          // }
        }
      },
      tags: true,
      followers: {
        select: {
          followerId: true
        }
      }
    }
  })

  if (!storeOwner) {
    notFound()
  }

  const totalProducts = storeOwner.products.length
  const totalFollowers = storeOwner.followers.length
  const productRatings = storeOwner.products.flatMap(product => product.reviews.map(review => review.rating))
  const productReviews = storeOwner.products.reduce((acc, product) => acc + product.reviews.length, 0)
const allProductReviews = storeOwner.products.flatMap(product => 
  product.reviews.map(review => ({
    ...review,
    productId: product.id,
    productName: product.name,
  }))
);

  const totalReviews =  productReviews
  const averageRating = totalReviews > 0 
    ? productReviews/ totalReviews
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={storeOwner.avatar || ''} alt={storeOwner.name} />
              <AvatarFallback className="text-2xl">
                {storeOwner.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{storeOwner.name}</h1>
                <Badge variant={storeOwner.role === 'COMPANY' ? 'default' : 'secondary'}>
                  {storeOwner.role}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {totalProducts} Products
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {averageRating.toFixed(1)} Rating ({totalReviews} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Since {new Date(storeOwner.createdAt).getFullYear()}
                </span>
              </div>

              {/* Store Tags */}
              {storeOwner.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {storeOwner.tags.map((tagData) => (
                    <Badge key={tagData.tag} variant="outline" className="text-xs">
                      {tagData.tag.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Store Info */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {storeOwner.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {storeOwner.location}
                  </span>
                )}
                {storeOwner.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {storeOwner.phone}
                  </span>
                )}
                {storeOwner.website && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <a href={storeOwner.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Visit Website
                    </a>
                  </span>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Products</h2>

            {storeOwner.products.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No products available</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {storeOwner.products.map((product) => {
                  const productRating = product.reviews.length > 0
                    ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
                    : 0

                  return (
                    <Card key={product.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        {product.images.length > 0 && (
                          <div className="aspect-square rounded-lg overflow-hidden mb-3">
                            <img 
                              src={product.images[0]} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {product.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl font-bold text-green-600">
                            ${product.price.toFixed(2)}
                          </span>
                          <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </Badge>
                        </div>

                        {product.reviews.length > 0 && (
                          <div className="flex items-center gap-1 mb-3">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-gray-600">
                              {productRating.toFixed(1)} ({product.reviews.length} reviews)
                            </span>
                          </div>
                        )}

                        <Badge variant="outline" className="mb-3">
                          {product.type.replace('_', ' ')}
                        </Badge>

                        <Link href={`/product/${product.id}`}>
                          <Button className="w-full">View Details</Button>
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
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{storeOwner.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Recent Reviews */}
            {allProductReviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Reviews</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {allProductReviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={review.user.avatar || ''} alt={review.user.name} />
                          <AvatarFallback className="text-xs">
                            {review.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
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
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
             {/* Contact Seller */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Seller</CardTitle>
              </CardHeader>
              <CardContent>
                {storeOwner.phone && (
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${storeOwner.phone}`} className="text-blue-600 hover:underline">
                      Call {storeOwner.name}
                    </a>
                  </div>
                )}
                {storeOwner.email && (
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${storeOwner.email}`} className="text-blue-600 hover:underline">
                      Email {storeOwner.name}
                    </a>
                  </div>
                )}
                <ChatWidget
                  participantId={storeOwner.id}
                  participantName={storeOwner.name}
                  participantAvatar={storeOwner.avatar || ''}
                  triggerButton={
                    <Button variant="outline">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chat with {storeOwner.name}
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