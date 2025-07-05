
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle, 
  MapPin,
  Phone,
  User,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import DeliveryStatusUpdater from '@/components/delivery/status-updater'

export default async function DeliveryAgentDashboard() {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'DELIVERY_AGENT') {
    redirect('/auth/login')
  }

  if (!user.isApproved) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <Clock className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <CardTitle>Account Pending Approval</CardTitle>
              <CardDescription>
                Your delivery agent account is pending admin approval. You'll be notified once approved.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // Fetch delivery statistics
  const [
    totalDeliveries,
    pendingDeliveries,
    completedDeliveries,
    assignedDeliveries,
    unassignedDeliveries
  ] = await Promise.all([
    prisma.delivery.count({
      where: { agentId: user.id }
    }),
    prisma.delivery.count({
      where: { 
        agentId: user.id,
        status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] }
      }
    }),
    prisma.delivery.count({
      where: { 
        agentId: user.id,
        status: 'DELIVERED'
      }
    }),
    // Assigned deliveries with full details
    prisma.delivery.findMany({
      where: { agentId: user.id },
      include: {
        order: {
          include: {
            customer: {
              select: {
                name: true,
                phone: true,
                email: true
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    type: true,
                    seller: {
                      select: {
                        name: true,
                        phone: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Unassigned deliveries in coverage area
    prisma.delivery.findMany({
      where: {
        agentId: null,
        status: 'ASSIGNED',
        // Add coverage area matching logic here
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                name: true,
                phone: true
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    type: true,
                    seller: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ])

  const getStatusColor = (status: string) => {
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

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your delivery assignments and track performance</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDeliveries}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingDeliveries}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedDeliveries}</div>
              <p className="text-xs text-muted-foreground">Delivered successfully</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{unassignedDeliveries.length}</div>
              <p className="text-xs text-muted-foreground">Ready to assign</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assigned Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                My Deliveries
              </CardTitle>
              <CardDescription>
                Deliveries assigned to you
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedDeliveries.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No deliveries assigned yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedDeliveries.map((delivery) => (
                    <div key={delivery.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(delivery.status)}>
                            {delivery.status.replace('_', ' ')}
                          </Badge>
                          <span className="font-medium">#{delivery.trackingId}</span>
                        </div>
                        <DeliveryStatusUpdater delivery={delivery} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium flex items-center gap-1 mb-2">
                            <User className="h-4 w-4" />
                            Customer
                          </h4>
                          <p>{delivery.order.customer.name}</p>
                          <p className="text-gray-600">{delivery.order.customer.phone}</p>
                          <p className="text-gray-600">{delivery.order.customer.email}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium flex items-center gap-1 mb-2">
                            <MapPin className="h-4 w-4" />
                            Delivery Address
                          </h4>
                          <p>{delivery.address}</p>
                          {delivery.deliveryNotes && (
                            <p className="text-gray-600 mt-1">Note: {delivery.deliveryNotes}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-2">Order Items</h4>
                        <div className="space-y-1">
                          {delivery.order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.product.name} x{item.quantity}</span>
                              <span className="font-medium">${item.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between font-medium mt-2 pt-2 border-t">
                          <span>Total</span>
                          <span>${delivery.order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unassigned Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Available Deliveries
              </CardTitle>
              <CardDescription>
                Orders in your coverage area ready for pickup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unassignedDeliveries.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No available deliveries in your area</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unassignedDeliveries.map((delivery) => (
                    <div key={delivery.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{delivery.trackingId}</Badge>
                          <span className="text-sm text-gray-600">
                            {new Date(delivery.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <form action={`/api/delivery/${delivery.id}/assign`} method="POST">
                          <Button size="sm" type="submit">
                            Accept Delivery
                          </Button>
                        </form>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium flex items-center gap-1 mb-2">
                            <User className="h-4 w-4" />
                            Customer
                          </h4>
                          <p>{delivery.order.customer.name}</p>
                          <p className="text-gray-600">{delivery.order.customer.phone}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium flex items-center gap-1 mb-2">
                            <MapPin className="h-4 w-4" />
                            Address
                          </h4>
                          <p>{delivery.address}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">
                            {delivery.order.items.length} items
                          </span>
                          <span className="font-medium">
                            ${delivery.order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
