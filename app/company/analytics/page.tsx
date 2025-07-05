
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  ShoppingCart,
  Star,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

export default function CompanyAnalytics() {
  const [user, setUser] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [period, setPeriod] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'COMPANY') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, period]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/company?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        toast.error('Failed to fetch analytics');
      }
    } catch (error) {
      toast.error('An error occurred while fetching analytics');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">Track your company's performance and growth</p>
          </div>
          <div className="flex space-x-2">
            {['7', '30', '90', '365'].map((days) => (
              <Button
                key={days}
                variant={period === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(days)}
              >
                {days === '365' ? '1 Year' : `${days} Days`}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : analytics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue || 0)}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    {getChangeIcon(analytics.revenueChange || 0)}
                    <span className={`text-sm ml-1 ${getChangeColor(analytics.revenueChange || 0)}`}>
                      {analytics.revenueChange >= 0 ? '+' : ''}{analytics.revenueChange?.toFixed(1) || 0}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold">{analytics.totalOrders || 0}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <ShoppingCart className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    {getChangeIcon(analytics.ordersChange || 0)}
                    <span className={`text-sm ml-1 ${getChangeColor(analytics.ordersChange || 0)}`}>
                      {analytics.ordersChange >= 0 ? '+' : ''}{analytics.ordersChange?.toFixed(1) || 0}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Products</p>
                      <p className="text-2xl font-bold">{analytics.activeProducts || 0}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Package className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-gray-500">
                      {analytics.outOfStock || 0} out of stock
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                      <p className="text-2xl font-bold">{formatCurrency(analytics.avgOrderValue || 0)}</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-full">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    {getChangeIcon(analytics.aovChange || 0)}
                    <span className={`text-sm ml-1 ${getChangeColor(analytics.aovChange || 0)}`}>
                      {analytics.aovChange >= 0 ? '+' : ''}{analytics.aovChange?.toFixed(1) || 0}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last period</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Top Selling Products</span>
                  </CardTitle>
                  <CardDescription>
                    Your best performing products this period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.topProducts && analytics.topProducts.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.topProducts.map((product: any, index: number) => (
                        <div key={product.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-medium text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-500">{product.type.replace('_', ' ')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{product.totalSold} sold</p>
                            <p className="text-sm text-gray-500">{formatCurrency(product.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No sales data available for this period
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Customer Insights</span>
                  </CardTitle>
                  <CardDescription>
                    Customer behavior and demographics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">New Customers</span>
                        <span className="text-sm text-gray-600">{analytics.newCustomers || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (analytics.newCustomers || 0) / (analytics.totalCustomers || 1) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Returning Customers</span>
                        <span className="text-sm text-gray-600">{analytics.returningCustomers || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (analytics.returningCustomers || 0) / (analytics.totalCustomers || 1) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{((analytics.returningCustomers || 0) / (analytics.totalCustomers || 1) * 100).toFixed(1)}%</p>
                          <p className="text-sm text-gray-600">Retention Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{analytics.avgOrdersPerCustomer?.toFixed(1) || '0.0'}</p>
                          <p className="text-sm text-gray-600">Avg Orders/Customer</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sponsorship Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5" />
                    <span>Sponsorship Performance</span>
                  </CardTitle>
                  <CardDescription>
                    Your sponsorship program analytics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{analytics.activeSponsorships || 0}</p>
                        <p className="text-sm text-gray-600">Active Sponsorships</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-indigo-600">{analytics.pendingApplications || 0}</p>
                        <p className="text-sm text-gray-600">Pending Applications</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Total Investment</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalSponsorshipInvestment || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription>
                    Latest orders and interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.recentOrders && analytics.recentOrders.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.recentOrders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div>
                            <p className="font-medium">Order #{order.id.slice(-8)}</p>
                            <p className="text-sm text-gray-500">{order.customer.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(order.total)}</p>
                            <Badge variant={order.status === 'DELIVERED' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No recent orders
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Analytics will appear once you have orders and activity.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
