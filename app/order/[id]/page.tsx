'use client';

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  MessageCircle,
  Download,
  CreditCard,
  Calendar,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Suspense } from 'react'

function OrderContent() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
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

        if (!userData) {
          router.replace('/not-found')
          return
        }

        // Fetch order data
        const orderResponse = await fetch(`/api/orders/${id}?userId=${userData.id}`)
        if (!orderResponse.ok) {
          throw new Error('Failed to fetch order')
        }
        const orderData = await orderResponse.json()
        
        if (!orderData) {
          router.replace('/not-found')
          return
        }

        setOrder(orderData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
        router.replace('/not-found')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'PACKED': return 'bg-purple-100 text-purple-800'
      case 'DISPATCHED': return 'bg-indigo-100 text-indigo-800'
      case 'OUT_FOR_DELIVERY': return 'bg-orange-100 text-orange-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      case 'REJECTED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'UNPAID': return 'bg-red-100 text-red-800'
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800'
      case 'PICKED_UP': return 'bg-yellow-100 text-yellow-800'
      case 'IN_TRANSIT': return 'bg-orange-100 text-orange-800'
      case 'OUT_FOR_DELIVERY': return 'bg-purple-100 text-purple-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getProgressSteps = () => {
    if (!order) return { steps: [], currentIndex: -1, progress: 0 }

    const steps = [
      { key: 'PENDING', label: 'Order Placed', icon: Package, description: 'Order has been placed and is awaiting confirmation' },
      { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle, description: 'Order has been confirmed and payment approved' },
      { key: 'PACKED', label: 'Packed', icon: Package, description: 'Items have been packed and ready for dispatch' },
      { key: 'DISPATCHED', label: 'Dispatched', icon: Truck, description: 'Order has been dispatched from the warehouse' },
      { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: MapPin, description: 'Order is out for delivery to your address' },
      { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle, description: 'Order has been successfully delivered' },
    ]

    const currentIndex = steps.findIndex(step => step.key === order.status)
    const progress = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0

    return { steps, currentIndex, progress }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !order || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error || 'Order not found'}</p>
        </div>
      </div>
    )
  }

  const { steps, currentIndex, progress } = getProgressSteps()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order #{order.id.slice(-8)}</h1>
              <p className="text-gray-600 mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={getStatusColor(order.status)}>
                {order.status.replace('_', ' ')}
              </Badge>
              <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                Payment: {order.paymentStatus}
              </Badge>
              {order.delivery && (
                <Badge className={getDeliveryStatusColor(order.delivery.status)}>
                  Delivery: {order.delivery.status.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Order Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Order Progress
                </CardTitle>
                <CardDescription>
                  Track your order status in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex
                    const isCurrent = index === currentIndex
                    
                    return (
                      <div key={step.key} className={`flex items-start space-x-3 ${
                        isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200'
                        } ${isCurrent ? 'ring-2 ring-green-300' : ''}`}>
                          <step.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${
                            isCompleted ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {step.description}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              Current Status
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Payment Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Method:</span>
                        <span>{order.paymentType.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Status:</span>
                        <Badge className={getPaymentStatusColor(order.paymentStatus)} variant="outline">
                          {order.paymentStatus}
                        </Badge>
                      </div>
                      {order.paymentPhone && (
                        <div className="flex justify-between text-sm">
                          <span>Phone:</span>
                          <span>{order.paymentPhone}</span>
                        </div>
                      )}
                      {order.paymentReference && (
                        <div className="flex justify-between text-sm">
                          <span>Reference:</span>
                          <span>{order.paymentReference}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Amount Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                      </div>
                      {order.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount:</span>
                          <span>-{formatCurrency(order.discountAmount)}</span>
                        </div>
                      )}
                      {order.delivery && (
                        <div className="flex justify-between text-sm">
                          <span>Delivery Fee:</span>
                          <span>{formatCurrency(order.delivery.fee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Approval History */}
                {order.paymentApprovals.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-3">Payment History</h4>
                    <div className="space-y-3">
                      {order.paymentApprovals.map((approval: any) => (
                        <div key={approval.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              {approval.action} by {approval.approver.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(approval.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {approval.notes && (
                            <p className="text-sm text-gray-600 mt-1">{approval.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Information */}
            {order.delivery && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Delivery Details</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Tracking ID:</span>
                          <span className="font-mono">{order.delivery.trackingId}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Status:</span>
                          <Badge className={getDeliveryStatusColor(order.delivery.status)} variant="outline">
                            {order.delivery.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Address:</span>
                          <span className="text-right max-w-xs">{order.delivery.address}</span>
                        </div>
                        {order.delivery.estimatedDelivery && (
                          <div className="flex justify-between text-sm">
                            <span>Estimated Delivery:</span>
                            <span>{new Date(order.delivery.estimatedDelivery).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {order.delivery.agent && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          Delivery Agent
                        </h4>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="font-medium text-sm">{order.delivery.agent.name}</p>
                          {order.delivery.agent.phone && (
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <Phone className="h-3 w-3 mr-1" />
                              {order.delivery.agent.phone}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">{order.delivery.agent.email}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delivery Timeline */}
                  {(order.delivery.pickupTime || order.delivery.dispatchTime || order.delivery.actualDelivery) && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-medium mb-3 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Delivery Timeline
                      </h4>
                      <div className="space-y-2">
                        {order.delivery.pickupTime && (
                          <div className="flex justify-between text-sm">
                            <span>Picked up:</span>
                            <span>{new Date(order.delivery.pickupTime).toLocaleString()}</span>
                          </div>
                        )}
                        {order.delivery.dispatchTime && (
                          <div className="flex justify-between text-sm">
                            <span>Dispatched:</span>
                            <span>{new Date(order.delivery.dispatchTime).toLocaleString()}</span>
                          </div>
                        )}
                        {order.delivery.actualDelivery && (
                          <div className="flex justify-between text-sm">
                            <span>Delivered:</span>
                            <span>{new Date(order.delivery.actualDelivery).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Notes */}
                  {order.delivery.deliveryNotes && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-medium mb-3 flex items-center">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Latest Update
                      </h4>
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm">{order.delivery.deliveryNotes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      {item.product.images.length > 0 && (
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity} × {formatCurrency(item.price)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Seller: {item.product.seller.name}
                        </p>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            {user.role !== 'CUSTOMER' && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{order.customer.name}</p>
                    <p className="text-sm text-gray-600">{order.customer.email}</p>
                    {order.customer.phone && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {order.customer.phone}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.role === 'CUSTOMER' && (
                  <Link href="/customer/orders">
                    <Button variant="outline" className="w-full">
                      View All Orders
                    </Button>
                  </Link>
                )}
                
                {order.status === 'DELIVERED' && order.payment && (
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Invoice
                  </Button>
                )}

                {user.role === 'ADMIN' && order.paymentStatus === 'SUBMITTED' && (
                  <Link href="/admin/payment-approvals">
                    <Button className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Review Payment
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  If you have any questions about your order, feel free to contact us.
                </p>
                <Button variant="outline" className="w-full">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Loading order details...</p>
        </div>
      </div>
    }>
      <OrderContent />
    </Suspense>
  )
}