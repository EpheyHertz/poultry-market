
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Package, 
  ShoppingCart,
  Star,
  Calendar,
  Award
} from 'lucide-react'

export default async function AdminAnalytics() {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  // Fetch analytics data
  const [
    totalRevenue,
    totalOrders,
    totalUsers,
    totalProducts,
    recentOrders,
    topSellers,
    topProducts,
    usersByRole,
    monthlyRevenue
  ] = await Promise.all([
    // Total revenue from completed orders
    prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { total: true }
    }),
    
    // Total orders
    prisma.order.count(),
    
    // Total users
    prisma.user.count(),
    
    // Total products
    prisma.product.count(),
    
    // Recent orders
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true, email: true }
        },
        items: {
          include: {
            product: {
              select: { name: true, price: true }
            }
          }
        }
      }
    }),
    
    // Top selling sellers
    prisma.user.findMany({
      where: { role: { in: ['SELLER', 'COMPANY'] } },
      include: {
        products: {
          include: {
            orderItems: {
              include: {
                order: true
              }
            }
          }
        },
        tags: true
      },
      take: 5
    }),
    
    // Top products by sales
    prisma.product.findMany({
      include: {
        orderItems: {
          include: {
            order: true
          }
        },
        seller: {
          select: { name: true, role: true }
        }
      },
      take: 5
    }),
    
    // Users by role
    prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    }),
    
    // Monthly revenue (last 6 months)
    prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
        }
      },
      select: {
        total: true,
        createdAt: true
      }
    })
  ])

  // Process top sellers data
  const processedSellers = topSellers.map(seller => {
    const totalSales = seller.products.reduce((sum, product) => 
      sum + product.orderItems.reduce((itemSum, item) => 
        itemSum + (item.order ? item.quantity * item.price : 0), 0), 0)
    
    const totalOrders = seller.products.reduce((sum, product) => 
      sum + product.orderItems.filter(item => item.order).length, 0)
    
    return {
      ...seller,
      totalSales,
      totalOrders
    }
  }).sort((a, b) => b.totalSales - a.totalSales)

  // Process top products data
  const processedProducts = topProducts.map(product => {
    const totalSales = product.orderItems.reduce((sum, item) => 
      sum + (item.order ? item.quantity * item.price : 0), 0)
    
    const totalQuantity = product.orderItems.reduce((sum, item) => 
      sum + (item.order ? item.quantity : 0), 0)
    
    return {
      ...product,
      totalSales,
      totalQuantity
    }
  }).sort((a, b) => b.totalSales - a.totalSales)

  // Process monthly revenue
  const monthlyData = monthlyRevenue.reduce((acc, order) => {
    const month = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    acc[month] = (acc[month] || 0) + order.total
    return acc
  }, {} as Record<string, number>)

  return (
    <DashboardLayout user={{ ...user, avatar: user.avatar ?? undefined }}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive platform performance metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${(totalRevenue._sum.total || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {totalOrders} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Across all roles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                Active listings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Sellers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Performing Sellers
              </CardTitle>
              <CardDescription>
                Sellers with highest revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processedSellers.map((seller, index) => (
                  <div key={seller.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{seller.name}</p>
                        <p className="text-sm text-gray-600">{seller.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${seller.totalSales.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{seller.totalOrders} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Products
              </CardTitle>
              <CardDescription>
                Products with highest sales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processedProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">by {product.seller.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${product.totalSales.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{product.totalQuantity} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Users by Role */}
          <Card>
            <CardHeader>
              <CardTitle>User Distribution</CardTitle>
              <CardDescription>
                Users across different roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usersByRole.map((roleData) => (
                  <div key={roleData.role} className="flex items-center justify-between">
                    <Badge variant="outline">{roleData.role}</Badge>
                    <span className="font-medium">{roleData._count.role}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                Latest platform activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Order #{order.id.slice(-8)}</p>
                      <p className="text-sm text-gray-600">{order.customer.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${order.total.toFixed(2)}</p>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
