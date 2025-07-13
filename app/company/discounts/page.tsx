'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Percent, 
  Package, 
  Calendar, 
  Edit, 
  Trash2,
  Search,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  images: string[]
  hasDiscount: boolean
  discountType: string
  discountAmount: number
  discountStartDate: string
  discountEndDate: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function CompanyDiscountsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  // Form state
  const [discountForm, setDiscountForm] = useState({
    hasDiscount: false,
    discountType: 'PERCENTAGE',
    discountAmount: '',
    discountStartDate: '',
    discountEndDate: ''
  })

  // Bulk discount state
  const [bulkDiscountForm, setBulkDiscountForm] = useState({
    productIds: [] as string[],
    discountType: 'PERCENTAGE',
    discountAmount: '',
    discountStartDate: '',
    discountEndDate: ''
  })

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchProducts()
    }
  }, [user])

  useEffect(() => {
    filterProducts()
  }, [products, searchTerm, filterType])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        if (userData.role !== 'COMPANY') {
          router.push('/auth/login')
          return
        }
        setUser(userData)
      } else {
        router.push('/auth/login')
      }
    } catch (error) {
      router.push('/auth/login')
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Failed to fetch products')
    } finally {
      setIsLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterType !== 'ALL') {
      if (filterType === 'DISCOUNTED') {
        filtered = filtered.filter(product => product.hasDiscount)
      } else if (filterType === 'NO_DISCOUNT') {
        filtered = filtered.filter(product => !product.hasDiscount)
      } else if (filterType === 'EXPIRED') {
        filtered = filtered.filter(product => 
          product.hasDiscount && 
          product.discountEndDate && 
          new Date(product.discountEndDate) < new Date()
        )
      } else if (filterType === 'ACTIVE') {
        filtered = filtered.filter(product => 
          product.hasDiscount && 
          product.discountStartDate && 
          product.discountEndDate &&
          new Date(product.discountStartDate) <= new Date() &&
          new Date(product.discountEndDate) > new Date()
        )
      }
    }

    setFilteredProducts(filtered)
  }

  const openDiscountDialog = (product: Product) => {
    setSelectedProduct(product)
    setDiscountForm({
      hasDiscount: product.hasDiscount,
      discountType: product.discountType || 'PERCENTAGE',
      discountAmount: product.discountAmount?.toString() || '',
      discountStartDate: product.discountStartDate 
        ? new Date(product.discountStartDate).toISOString().slice(0, 16)
        : '',
      discountEndDate: product.discountEndDate 
        ? new Date(product.discountEndDate).toISOString().slice(0, 16)
        : ''
    })
    setIsDialogOpen(true)
  }

  const handleSaveDiscount = async () => {
    if (!selectedProduct) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/products/${selectedProduct.id}/discount`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discountForm),
      })

      if (response.ok) {
        toast.success('Discount updated successfully')
        await fetchProducts()
        setIsDialogOpen(false)
        setSelectedProduct(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update discount')
      }
    } catch (error) {
      console.error('Discount update error:', error)
      toast.error('Failed to update discount')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulkDiscount = async () => {
    if (bulkDiscountForm.productIds.length === 0) {
      alert('Please select at least one product')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/products/bulk-discount', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
  hasDiscount: true,
  ...bulkDiscountForm
}),

      })

      if (response.ok) {
        await fetchProducts()
        setBulkDiscountForm({
          productIds: [],
          discountType: 'PERCENTAGE',
          discountAmount: '',
          discountStartDate: '',
          discountEndDate: ''
        })
        alert('Bulk discount applied successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to apply bulk discount')
      }
    } catch (error) {
      console.error('Bulk discount error:', error)
      alert('Failed to apply bulk discount')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveDiscount = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this discount?')) return

    try {
      const response = await fetch(`/api/products/${productId}/discount`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Discount removed successfully')
        await fetchProducts()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove discount')
      }
    } catch (error) {
      console.error('Discount removal error:', error)
      toast.error('Failed to remove discount')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const calculateDiscountedPrice = (product: Product) => {
    if (!product.hasDiscount || !product.discountAmount) return product.price

    if (product.discountType === 'PERCENTAGE') {
      return product.price - (product.price * product.discountAmount / 100)
    } else {
      return product.price - product.discountAmount
    }
  }

  const getDiscountStatus = (product: Product) => {
    if (!product.hasDiscount) return { status: 'No Discount', color: 'bg-gray-100 text-gray-800' }

    const now = new Date()
    const startDate = product.discountStartDate ? new Date(product.discountStartDate) : null
    const endDate = product.discountEndDate ? new Date(product.discountEndDate) : null

    if (startDate && startDate > now) {
      return { status: 'Scheduled', color: 'bg-blue-100 text-blue-800' }
    } else if (endDate && endDate < now) {
      return { status: 'Expired', color: 'bg-red-100 text-red-800' }
    } else {
      return { status: 'Active', color: 'bg-green-100 text-green-800' }
    }
  }

  const getDiscountStats = () => {
    const totalProducts = products.length
    const discountedProducts = products.filter(p => p.hasDiscount).length
    const activeDiscounts = products.filter(p => {
      if (!p.hasDiscount) return false
      const now = new Date()
      const startDate = p.discountStartDate ? new Date(p.discountStartDate) : null
      const endDate = p.discountEndDate ? new Date(p.discountEndDate) : null
      return (!startDate || startDate <= now) && (!endDate || endDate > now)
    }).length

    return { totalProducts, discountedProducts, activeDiscounts }
  }

  const stats = getDiscountStats()

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Discounts</h1>
            <p className="text-gray-600 mt-2">Manage discounts and promotions for your products</p>
          </div>
        </div>

        {/* Stats Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Percent className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">With Discounts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.discountedProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Discounts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeDiscounts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div> */}

        {/* Tabs */}
        {/* <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="products">Individual Products</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Discounts</TabsTrigger>
          </TabsList> */}

        {/* <TabsContent value="products" className="space-y-6"> */}
        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Products</SelectItem>
                  <SelectItem value="DISCOUNTED">With Discounts</SelectItem>
                  <SelectItem value="NO_DISCOUNT">No Discount</SelectItem>
                  <SelectItem value="ACTIVE">Active Discounts</SelectItem>
                  <SelectItem value="EXPIRED">Expired Discounts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">
                {searchTerm || filterType !== 'ALL' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Add some products to start managing discounts'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const discountStatus = getDiscountStatus(product)
              const discountedPrice = calculateDiscountedPrice(product)

              return (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-w-16 aspect-h-9">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <Badge className={discountStatus.color}>
                        {discountStatus.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {/* Price Information */}
                      <div>
                        {product.hasDiscount ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-green-600">
                              {formatCurrency(discountedPrice)}
                            </span>
                            <span className="text-sm text-gray-500 line-through">
                              {formatCurrency(product.price)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {product.discountType === 'PERCENTAGE' 
                                ? `-${product.discountAmount}%`
                                : `-${formatCurrency(product.discountAmount)}`
                              }
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-lg font-bold">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                      </div>

                      {/* Stock */}
                      <p className="text-sm text-gray-600">
                        Stock: {product.stock} units
                      </p>

                      {/* Discount Dates */}
                      {product.hasDiscount && product.discountStartDate && product.discountEndDate && (
                        <div className="text-xs text-gray-500">
                          <p>From: {new Date(product.discountStartDate).toLocaleDateString()}</p>
                          <p>Until: {new Date(product.discountEndDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <Button
                        onClick={() => openDiscountDialog(product)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {product.hasDiscount ? 'Edit' : 'Add'} Discount
                      </Button>

                      {product.hasDiscount && (
                        <Button
                          onClick={() => handleRemoveDiscount(product.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Discount Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Percent className="h-5 w-5 mr-2" />
                {selectedProduct?.hasDiscount ? 'Edit' : 'Add'} Product Discount
              </DialogTitle>
            </DialogHeader>

            {selectedProduct && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">{selectedProduct.name}</h4>
                  <p className="text-sm text-gray-600">
                    Current Price: {formatCurrency(selectedProduct.price)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hasDiscount"
                      checked={discountForm.hasDiscount}
                      onChange={(e) => setDiscountForm({
                        ...discountForm,
                        hasDiscount: e.target.checked
                      })}
                      className="rounded"
                    />
                    <Label htmlFor="hasDiscount">Enable discount for this product</Label>
                  </div>

                  {discountForm.hasDiscount && (
                    <>
                      <div>
                        <Label htmlFor="discountType">Discount Type</Label>
                        <Select 
                          value={discountForm.discountType} 
                          onValueChange={(value) => setDiscountForm({
                            ...discountForm,
                            discountType: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                            <SelectItem value="FIXED_AMOUNT">Fixed Amount ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="discountAmount">
                          Discount {discountForm.discountType === 'PERCENTAGE' ? 'Percentage' : 'Amount'}
                        </Label>
                        <Input
                          id="discountAmount"
                          type="number"
                          value={discountForm.discountAmount}
                          onChange={(e) => setDiscountForm({
                            ...discountForm,
                            discountAmount: e.target.value
                          })}
                          placeholder={discountForm.discountType === 'PERCENTAGE' ? '10' : '5.00'}
                          min="0"
                          max={discountForm.discountType === 'PERCENTAGE' ? '100' : selectedProduct.price.toString()}
                          step={discountForm.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                        />
                      </div>

                      <div>
                        <Label htmlFor="discountStartDate">Start Date</Label>
                        <Input
                          id="discountStartDate"
                          type="datetime-local"
                          value={discountForm.discountStartDate}
                          onChange={(e) => setDiscountForm({
                            ...discountForm,
                            discountStartDate: e.target.value
                          })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="discountEndDate">End Date</Label>
                        <Input
                          id="discountEndDate"
                          type="datetime-local"
                          value={discountForm.discountEndDate}
                          onChange={(e) => setDiscountForm({
                            ...discountForm,
                            discountEndDate: e.target.value
                          })}
                        />
                      </div>

                      {/* Preview */}
                      {discountForm.discountAmount && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">Preview</h4>
                          <div className="text-sm">
                            <p>Original Price: {formatCurrency(selectedProduct.price)}</p>
                            <p className="text-green-600 font-medium">
                              Discounted Price: {formatCurrency(
                                discountForm.discountType === 'PERCENTAGE'
                                  ? selectedProduct.price - (selectedProduct.price * parseFloat(discountForm.discountAmount) / 100)
                                  : selectedProduct.price - parseFloat(discountForm.discountAmount)
                              )}
                            </p>
                            <p className="text-gray-600">
                              Savings: {discountForm.discountType === 'PERCENTAGE' 
                                ? `${discountForm.discountAmount}%`
                                : formatCurrency(parseFloat(discountForm.discountAmount))
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={() => setIsDialogOpen(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveDiscount}
                    disabled={isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? 'Saving...' : 'Save Discount'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* </TabsContent>

          <TabsContent value="bulk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Apply Bulk Discount
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Products</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`bulk-${product.id}`}
                          checked={bulkDiscountForm.productIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkDiscountForm({
                                ...bulkDiscountForm,
                                productIds: [...bulkDiscountForm.productIds, product.id]
                              })
                            } else {
                              setBulkDiscountForm({
                                ...bulkDiscountForm,
                                productIds: bulkDiscountForm.productIds.filter(id => id !== product.id)
                              })
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={`bulk-${product.id}`} className="text-sm">
                          {product.name} - {formatCurrency(product.price)}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {bulkDiscountForm.productIds.length} products
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bulkDiscountType">Discount Type</Label>
                    <Select 
                      value={bulkDiscountForm.discountType} 
                      onValueChange={(value) => setBulkDiscountForm({
                        ...bulkDiscountForm,
                        discountType: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Fixed Amount (KES)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bulkDiscountAmount">
                      Discount {bulkDiscountForm.discountType === 'PERCENTAGE' ? 'Percentage' : 'Amount'}
                    </Label>
                    <Input
                      id="bulkDiscountAmount"
                      type="number"
                      value={bulkDiscountForm.discountAmount}
                      onChange={(e) => setBulkDiscountForm({
                        ...bulkDiscountForm,
                        discountAmount: e.target.value
                      })}
                      placeholder={bulkDiscountForm.discountType === 'PERCENTAGE' ? '10' : '100'}
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bulkDiscountStartDate">Start Date</Label>
                    <Input
                      id="bulkDiscountStartDate"
                      type="datetime-local"
                      value={bulkDiscountForm.discountStartDate}
                      onChange={(e) => setBulkDiscountForm({
                        ...bulkDiscountForm,
                        discountStartDate: e.target.value
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bulkDiscountEndDate">End Date</Label>
                    <Input
                      id="bulkDiscountEndDate"
                      type="datetime-local"
                      value={bulkDiscountForm.discountEndDate}
                      onChange={(e) => setBulkDiscountForm({
                        ...bulkDiscountForm,
                        discountEndDate: e.target.value
                      })}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleBulkDiscount}
                  disabled={isSaving || bulkDiscountForm.productIds.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? 'Applying...' : `Apply Discount to ${bulkDiscountForm.productIds.length} Products`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs> */}

      </div>
    </DashboardLayout>
  )
}