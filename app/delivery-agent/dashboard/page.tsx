import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle, 
  MapPin,
  Phone,
  Navigation
} from 'lucide-react';
import Link from 'next/link';

export default async function DeliveryAgentDashboard() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'DELIVERY_AGENT') {
    redirect('/auth/login');
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
    );
  }

  // Fetch delivery statistics
  const [
    totalDeliveries,
    pendingDeliveries,
    completedDeliveries,
    recentDeliveries
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
    prisma.delivery.findMany({
      where: { agentId: user.id },
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
                    type: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  const stats = [
    {
      title: 'Total Deliveries',
      value: totalDeliveries,
      icon: Package,
      description: 'All time deliveries'
    },
    {
      title: 'Pending Deliveries',
      value: pendingDeliveries,
      icon: Clock,
      description: 'Active deliveries'
    },
    {
      title: 'Completed',
      value: completedDeliveries,
      icon: CheckCircle,
      description: 'Successfully delivered'
    },
    {
      title: 'Success Rate',
      value: totalDeliveries > 0 ? `${Math.round((completedDeliveries / totalDeliveries) * 100)}%` : '0%',
      icon: Truck,
      description: 'Delivery success rate'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'PICKED_UP': return 'bg-purple-100 text-purple-800';
      case 'IN_TRANSIT': return 'bg-orange-100 text-orange-800';
      case 'OUT_FOR_DELIVERY': return 'bg-yellow-100 text-yellow-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
          <p className="text-gray-600 mt-2">Manage your deliveries and track your performance.</p>
          {user.agentId && (
            <p className="text-sm text-gray-500 mt-1">Agent ID: {user.agentId}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your delivery tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/delivery-agent/deliveries?status=ASSIGNED">
                <Button className="w-full" variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  New Assignments
                </Button>
              </Link>
              <Link href="/delivery-agent/deliveries?status=IN_TRANSIT">
                <Button className="w-full" variant="outline">
                  <Truck className="mr-2 h-4 w-4" />
                  In Transit
                </Button>
              </Link>
              <Link href="/delivery-agent/deliveries">
                <Button className="w-full" variant="outline">
                  <Navigation className="mr-2 h-4 w-4" />
                  All Deliveries
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Deliveries</CardTitle>
            <CardDescription>Your latest delivery assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No deliveries yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  New delivery assignments will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDeliveries.map((delivery) => (
                  <div key={delivery.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Order #{delivery.order.id.slice(-8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {delivery.order.customer.name}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {delivery.address.substring(0, 50)}...
                              </span>
                            </div>
                            {delivery.order.customer.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {delivery.order.customer.phone}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(delivery.status)}>
                          {delivery.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {delivery.trackingId}
                        </span>
                      </div>
                    </div>
                    
                    {/* Order Items */}
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Items:</p>
                      <div className="flex flex-wrap gap-1">
                        {delivery.order.items.map((item: any) => (
                          <Badge key={item.id} variant="outline" className="text-xs">
                            {item.quantity}x {item.product.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Notes */}
                    {delivery.deliveryNotes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <strong>Notes:</strong> {delivery.deliveryNotes}
                      </div>
                    )}
                  </div>
                ))}
                <div className="text-center">
                  <Link href="/delivery-agent/deliveries">
                    <Button variant="outline">View All Deliveries</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}