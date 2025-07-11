'use client'

import { Suspense, useEffect, useState } from 'react'
import { notFound, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/formatCurrency'
import StockAlert from '@/components/stock/stock-alert'
import Link from 'next/link'
import Image from 'next/image'

function ProductGrid({ type }: { type: string }) {
  const [category, setCategory] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/categories/${type}`)
      .then(res => {
        if (!res.ok) throw new Error('Category not found')
        return res.json()
      })
      .then(data => {
        setCategory(data.category)
        setProducts(data.products)
      })
      .catch(() => {
        setError(true)
      })
  }, [type])

  if (error) return notFound()
  if (!category) return <p className="text-center py-12">Loading category...</p>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground text-lg">{category.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <div className="relative aspect-square">
              <Image
                src={product.images[0] || '/placeholder-product.jpg'}
                alt={product.name}
                fill
                className="object-cover rounded-t-lg"
              />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="line-clamp-2">{product.name}</CardTitle>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(product.price)}
                </span>
                <StockAlert stock={product.stock} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  By {product.seller.name}
                </span>
                <Badge variant="outline">{product.seller.role}</Badge>
              </div>
              <Link href={`/product/${product.slug || product.id}`}>
                <Button className="w-full">View Details</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No products found in this category.
          </p>
        </div>
      )}
    </div>
  )
}

export default function CategoryPage() {
  const params = useParams()
  const type = typeof params?.type === 'string' ? params.type : Array.isArray(params?.type) ? params.type[0] : ''

  return (
    <Suspense fallback={<p className="text-center py-12">Loading...</p>}>
      <ProductGrid type={type} />
    </Suspense>
  )
}
