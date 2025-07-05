
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Search,
  Phone,
  User,
  Calendar
} from 'lucide-react'

interface Delivery {
  id: string
  trackingId: string
  status: string
  address: string
  estimatedDelivery: string
  actualDelivery: string
  pickupTime: string
  dispatchTime: string
  deliveryNotes: string
  agentName: string
  agentPhone: string
  vehicleInfo: string
  createdAt: string
  updatedAt: string
  order: {
    id: string
    total: number
    status: string
    createdAt: string
    items: Array<{
      id: string
      quantity: number
      price: number
      product: {
        id: string
        name: string
        images: string[]
        seller: {
          id: string
          name: string
          phone: string
        }
      }
    }>
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function CustomerDeliveriesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    fetchUser()
    fetchDeliveries()
  }, [])

  useEffect(() => {
    filterDeliveries()
  }, [deliveries, searchTerm, statusFilter])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  const fetchDeliveries = async () => {
    try {
      const response = await fetch('/api/delivery/customer')
      if (response.ok) {
        const data = await response.json()
        setDeliveries(data.deliveries)
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterDeliveries = () => {
    let filtered = deliveries

    if (searchTerm) {
      filtered = filtered.filter(delivery =>
        delivery.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.agentName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(delivery => delivery.status === statusFilter)
    }

    setFilteredDeliveries(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800'
      case 'PICKED_UP': return 'bg-yellow-100 text-yellow-800'
      case 'IN_TRANSIT': return 'bg-purple-100 text-purple-800'
      case 'OUT_FOR_DELIVERY': return 'bg-orange-100 text-orange-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'RETURNED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return <Package className="h-4 w-4" />
      case 'PICKED_UP': return <Truck className="h-4 w-4" />
      case 'IN_TRANSIT': return <Truck className="h-4 w-4" />
      case 'OUT_FOR_DELIVERY': return <MapPin className="h-4 w-4" />
      case 'DELIVERED': return <CheckCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const getDeliveryProgress = (status: string) => {
    const statuses = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']
    const currentIndex = statuses.indexOf(status)
    return ((currentIndex + 1) / statuses.length) * 100
  }

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
            <h1 className="text-3xl font-bold text-gray-900">My Deliveries</h1>
            <p className="text-gray-600 mt-2">Track all your delivery status and details</p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by tracking ID, order ID, or agent name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
                <TabsList>
                  <TabsTrigger value="ALL">All</TabsTrigger>
                  <TabsTrigger value="ASSIGNED">Assigned</TabsTrigger>
                  <TabsTrigger value="PICKED_UP">Picked Up</TabsTrigger>
                  <TabsTrigger value="IN_TRANSIT">In Transit</TabsTrigger>
                  <TabsTrigger value="OUT_FOR_DELIVERY">Out for Delivery</TabsTrigger>
                  <TabsTrigger value="DELIVERED">Delivered</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading deliveries...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No deliveries found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'ALL' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'You have no deliveries yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredDeliveries.map((delivery) => (
              <Card key={delivery.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center">
                        <Truck className="h-5 w-5 mr-2" />
                        Tracking: {delivery.trackingId}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Order #{delivery.order.id.slice(-8)} • {formatCurrency(delivery.order.total)}
                      </p>
                    </div>
                    <Badge className={getStatusColor(delivery.status)}>
                      {getStatusIcon(delivery.status)}
                      <span className="ml-1">{delivery.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getDeliveryProgress(delivery.status)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Delivery Address */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Delivery Address
                      </h4>
                      <p className="text-sm text-gray-600">{delivery.address}</p>
                    </div>

                    {/* Delivery Agent */}
                    {delivery.agentName && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Delivery Agent
                        </h4>
                        <div className="text-sm text-gray-600">
                          <p>{delivery.agentName}</p>
                          {delivery.agentPhone && (
                            <p className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {delivery.agentPhone}
                            </p>
                          )}
                          {delivery.vehicleInfo && (
                            <p className="text-xs text-gray-500 mt-1">{delivery.vehicleInfo}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Timeline
                      </h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>Created:</strong> {new Date(delivery.createdAt).toLocaleString()}</p>
                        {delivery.pickupTime && (
                          <p><strong>Picked Up:</strong> {new Date(delivery.pickupTime).toLocaleString()}</p>
                        )}
                        {delivery.dispatchTime && (
                          <p><strong>Dispatched:</strong> {new Date(delivery.dispatchTime).toLocaleString()}</p>
                        )}
                        {delivery.estimatedDelivery && (
                          <p><strong>Estimated:</strong> {new Date(delivery.estimatedDelivery).toLocaleString()}</p>
                        )}
                        {delivery.actualDelivery && (
                          <p><strong>Delivered:</strong> {new Date(delivery.actualDelivery).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Order Items ({delivery.order.items.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {delivery.order.items.map((item) => (
                        <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          {item.product.images[0] && (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.product.name}</p>
                            <p className="text-xs text-gray-600">
                              Qty: {item.quantity} • {formatCurrency(item.price * item.quantity)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Seller: {item.product.seller.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Notes */}
                  {delivery.deliveryNotes && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-1">Delivery Notes</h4>
                      <p className="text-sm text-gray-600">{delivery.deliveryNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
