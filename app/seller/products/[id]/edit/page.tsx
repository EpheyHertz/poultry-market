"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ImageUpload from '@/components/ui/image-upload'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface EditProductProps {
  params: {
    id: string
  }
}

export default function EditProduct() {
   const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch user data
        const userResponse = await fetch('/api/auth/current-user')
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user')
        }
        const userData = await userResponse.json()
        setUser(userData)

        if (!userData || userData.role !== 'SELLER') {
          router.push('/auth/login')
          return
        }

        // Fetch product data
        const productResponse = await fetch(`/api/products/${id}?sellerId=${userData.id}`)
        if (!productResponse.ok) {
          throw new Error('Failed to fetch product')
        }
        const productData = await productResponse.json()
        
        if (!productData) {
          setError('Product not found')
          return
        }

        setProduct(productData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, router])

  if (loading) {
    return (
      <DashboardLayout user={undefined}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-64">
            <p>Loading product data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout user={user}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!product) {
    return (
      <DashboardLayout user={user}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-64">
            <p>Product not found</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/seller/products">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-gray-600 mt-2">Update your product information</p>
          </div>
        </div>

        {/* Product Form */}
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>
              Update your product details below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" action={`/api/products/${product.id}`} method="PUT">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={product.name}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Product Type *</Label>
                  <Select name="type" defaultValue={product.type} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGGS">Eggs</SelectItem>
                      <SelectItem value="CHICKEN_MEAT">Chicken Meat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={product.price}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    defaultValue={product.stock}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={product.description}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Product Images</Label>
                <ImageUpload
                  name="images"
                  multiple={true}
                  maxFiles={5}
                  accept="image/*"
                  defaultImages={product.images}
                />
                <p className="text-sm text-gray-500">
                  Upload up to 5 high-quality images of your product.
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <Link href="/seller/products">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit">
                  Update Product
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}