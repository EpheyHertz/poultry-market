
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Phone,
  User,
  Navigation
} from 'lucide-react'

interface DeliveryTrackerProps {
  orderId: string
  userRole: string
  onAssignDelivery?: () => void
}

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
}

export default function OrderDeliveryTracker({ 
  orderId, 
  userRole, 
  onAssignDelivery 
}: DeliveryTrackerProps) {
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    fetchDelivery()
  }, [orderId])

  const fetchDelivery = async () => {
    try {
      const response = await fetch(`/api/delivery/order/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setDelivery(data.delivery)
      }
    } catch (error) {
      console.error('Failed to fetch delivery:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignDelivery = async () => {
    setIsAssigning(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/assign-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        fetchDelivery()
        onAssignDelivery?.()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to assign delivery')
      }
    } catch (error) {
      console.error('Delivery assignment error:', error)
      alert('Failed to assign delivery')
    } finally {
      setIsAssigning(false)
    }
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

  const getDeliveryProgress = (status: string) => {
    const statuses = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']
    const currentIndex = statuses.indexOf(status)
    return ((currentIndex + 1) / statuses.length) * 100
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading delivery information...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!delivery) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="h-5 w-5 mr-2" />
            Delivery Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No delivery assigned yet</p>
            {(userRole === 'ADMIN' || userRole === 'SELLER' || userRole === 'COMPANY') && (
              <Button 
                onClick={handleAssignDelivery}
                disabled={isAssigning}
                className="bg-green-600 hover:bg-green-700"
              >
                {isAssigning ? 'Assigning...' : 'Assign Delivery'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center">
            <Truck className="h-5 w-5 mr-2" />
            Delivery Tracking
          </CardTitle>
          <Badge className={getStatusColor(delivery.status)}>
            {delivery.status.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">Tracking ID: {delivery.trackingId}</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Delivery Progress</span>
            <span>{Math.round(getDeliveryProgress(delivery.status))}%</span>
          </div>
          <Progress value={getDeliveryProgress(delivery.status)} className="w-full" />
        </div>

        {/* Delivery Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="md:col-span-2">
            <h4 className="font-semibold mb-2 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Delivery Timeline
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p><strong>Created:</strong> {new Date(delivery.createdAt).toLocaleString()}</p>
                {delivery.pickupTime && (
                  <p><strong>Picked Up:</strong> {new Date(delivery.pickupTime).toLocaleString()}</p>
                )}
              </div>
              <div className="space-y-1">
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
        </div>

        {/* Delivery Notes */}
        {delivery.deliveryNotes && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-sm mb-1">Delivery Notes</h4>
            <p className="text-sm text-gray-600">{delivery.deliveryNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
