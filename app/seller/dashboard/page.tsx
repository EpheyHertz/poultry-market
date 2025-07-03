import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ShoppingCart, DollarSign, TrendingUp, Plus, Eye } from 'lucide-react';
import Link from 'next/link';

export default async function SellerDashboard() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'SELLER') {
    redirect('/auth/login');
  }

  // Fetch seller statistics
  const [products, orders, totalRevenue, recentOrders] = await Promise.all([
    prisma.product.count({
      where: { sellerId: user.id }
    }),
    prisma.order.count({
      where: {
        items: {
          some: {
            product: {
              sellerId: user.id
            }
          }
        }
      }
    }),
    prisma.order.aggregate({
      where: {
        items: {
          some: {
            product: {
              sellerId: user.id
            }
          }
        },
        status: 'DELIVERED'
      },
      _sum: {
        total: true
      }
    }),
    prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              sellerId: user.id
            }
          }
        }
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true
              }
            }
          },
          where: {
            product: {
              sellerId: user.id
            }
          }
        },
        delivery: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  const stats = [
    {
      title: 'Total Products',
      value: products,
      icon: Package,
      description: 'Products listed'
    },
    {
      title: 'Total Orders',
      value: orders,
      icon: ShoppingCart,
      description: 'Orders received'
    },
    {
      title: 'Revenue',
      value: `$${(totalRevenue._sum.total || 0).toFixed(2)}`,
      icon: DollarSign,
      description: 'Total earnings'
    },
    {
      title: 'Growth',
      value: '+12%',
      icon: TrendingUp,
      description: 'vs last month'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'SHIPPED': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
            <p className="text-gray-600 mt-2">Manage your products and track your sales performance.</p>
          </div>
          <div className="flex space-x-2">
            <Link href="/seller/products/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </Link>
            {user.dashboardSlug && (
              <Link href={`/store/${user.dashboardSlug}`} target="_blank">
                <Button variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  View Store
                </Button>
              </Link>
            )}
          </div>
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
            <CardDescription>Manage your seller account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/seller/products/new">
                <Button className="w-full" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </Link>
              <Link href="/seller/orders">
                <Button className="w-full" variant="outline">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  View Orders
                </Button>
              </Link>
              <Link href="/seller/vouchers">
                <Button className="w-full" variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  Manage Vouchers
                </Button>
              </Link>
              <Link href="/seller/sponsorships">
                <Button className="w-full" variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Sponsorships
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders for your products</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                <p className="mt-1 text-sm text-gray-500">Orders for your products will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Order #{order.id.slice(-8)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.customer.name} • {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">${order.total.toFixed(2)}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="text-center">
                  <Link href="/seller/orders">
                    <Button variant="outline">View All Orders</Button>
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