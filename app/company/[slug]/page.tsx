'use client';

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Star, MapPin, Phone, Mail, Award, Package, Users, Calendar, MessageCircle, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import ChatWidget from '@/components/chat/chat-widget'
import { Suspense } from 'react'
import { formatProductTypeLabel } from '@/lib/utils'

function CompanyPublicContent() {
  const params = useParams()
  const slug = typeof params?.slug === 'string' ? params.slug : ''
  const [company, setCompany] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`/api/company/${slug}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setCompany(data.company)
        setStats(data.stats)
      } catch (err) {
        notFound()
      } finally {
        setLoading(false)
      }
    }

    if (slug) fetchCompany()
  }, [slug])

  if (loading) return <p className="p-8 text-gray-500">Loading...</p>
  if (!company) return null

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CHICKEN_FEED': return 'bg-green-100 text-green-800'
      case 'CHICKS': return 'bg-orange-100 text-orange-800'
      case 'HATCHING_EGGS': return 'bg-purple-100 text-purple-800'
      case 'CUSTOM': return 'bg-slate-100 text-slate-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {company.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-gray-600 mt-1">Poultry Company</p>
                <div className="flex items-center space-x-2 mt-2">
                  {company.tags.map((tag: any) => (
                    <Badge key={tag.tag} variant="secondary">
                      <Award className="h-3 w-3 mr-1" />
                      {tag.tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Member since</div>
              <div className="font-medium">
                {new Date(company.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats + Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 text-center">
                <Package className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <div className="text-2xl font-bold">{company._count.products}</div>
                <div className="text-sm text-gray-600">Products</div>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <div className="text-2xl font-bold">{stats._count}</div>
                <div className="text-sm text-gray-600">Orders</div>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <Star className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                <div className="text-2xl font-bold">{company._count.sponsorships}</div>
                <div className="text-sm text-gray-600">Sponsorships</div>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <Calendar className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <div className="text-2xl font-bold">${(stats._sum.total || 0).toFixed(0)}</div>
                <div className="text-sm text-gray-600">Revenue</div>
              </CardContent></Card>
            </div>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Products</span>
                </CardTitle>
                <CardDescription>
                  Browse our selection of feeds, chicks, and hatching eggs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {company.products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No products available at the moment
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {company.products.map((product: any) => (
                      <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        {product.images?.[0] ? (
                          <div className="relative h-32 w-full">
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="(min-width: 1024px) 250px, 100vw"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-sm">{product.name}</h3>
                  <Badge className={`${getTypeColor(product.type)} text-xs px-2 py-0.5`}>
                    {formatProductTypeLabel(product.type, product.customType)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {product.description}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-green-600">${product.price.toFixed(2)}</span>
                            <span className="text-xs text-gray-500">{product.stock} available</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3"><Mail className="h-4 w-4 text-gray-500" /><span className="text-sm">{company.email}</span></div>
                {company.phone && (<div className="flex items-center space-x-3"><Phone className="h-4 w-4 text-gray-500" /><span className="text-sm">{company.phone}</span></div>)}
                {company.address && (<div className="flex items-center space-x-3"><MapPin className="h-4 w-4 text-gray-500" /><span className="text-sm">{company.address}</span></div>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/products?sellerId=${company.id}`}>
                  <Button className="w-full" variant="outline">
                    <Package className="mr-2 h-4 w-4" />
                    View All Products
                  </Button>
                </Link>
                <div className="flex flex-wrap gap-4">
                  <Button><Phone className="mr-2 h-4 w-4" /> Contact Company</Button>
                  <Button variant="outline"><Mail className="mr-2 h-4 w-4" /> Email Company</Button>
                  <ChatWidget
                    participantId={company.id}
                    participantName={company.name}
                    participantAvatar={company.avatar}
                    triggerButton={
                      <Button variant="outline">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Chat with Company
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>
            {company.bio && (
              <Card>
                <CardHeader><CardTitle>About</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{company.bio}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CompanyPublicPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="p-8 text-gray-500">Loading company information...</p>
    </div>}>
      <CompanyPublicContent />
    </Suspense>
  )
}