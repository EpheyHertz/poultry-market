
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Package, 
  ShoppingCart,
  Award,
  Activity,
  Percent,
  Loader2,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

export default function AdminAnalytics() {
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
          if (userData.role !== 'ADMIN') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/login');
        }
      } catch {
        router.push('/auth/login');
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, period]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics/enhanced?period=${period}`);
      if (res.ok) setAnalytics(await res.json());
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return <div>Loading...</div>;

  if (isLoading || !analytics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { summary, revenueChart, topSellers, topProducts, usersByRole } = analytics;

  const stats = [
    {
      title: 'Total GMV',
      value: formatCurrency(summary.totalGMV),
      icon: DollarSign,
      description: `From ${summary.totalOrders} orders`,
      color: 'text-green-600',
    },
    {
      title: 'Active Sellers',
      value: summary.activeSellers,
      icon: Users,
      description: `of ${summary.totalSellers} total sellers`,
      color: 'text-blue-600',
    },
    {
      title: 'Daily Transactions',
      value: summary.dailyTransactions,
      icon: Activity,
      description: 'Today',
      color: 'text-purple-600',
    },
    {
      title: 'Commission Earnings',
      value: formatCurrency(summary.commissionEarnings),
      icon: Percent,
      description: `Avg rate ${summary.avgCommissionRate}%`,
      color: 'text-orange-600',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Platform Analytics</h1>
            <p className="text-muted-foreground mt-1">Comprehensive performance metrics</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue (GMV)</CardTitle>
            <CardDescription>Platform gross merchandise value over time</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueChart.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>No revenue data for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
                    }}
                  />
                  <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
                    }
                  />
                  <Bar dataKey="revenue" fill="#0088FE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Sellers + Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" /> Top Performing Sellers
              </CardTitle>
              <CardDescription>Sellers with highest revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {topSellers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No seller data yet</p>
              ) : (
                <div className="space-y-3">
                  {topSellers.map((seller: any, i: number) => (
                    <div key={seller.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{i + 1}</Badge>
                        <div>
                          <p className="font-medium text-sm">{seller.name}</p>
                          <p className="text-xs text-muted-foreground">{seller.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-green-600">{formatCurrency(seller.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{seller.orderCount} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Top Products
              </CardTitle>
              <CardDescription>Products with highest sales</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No product data yet</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product: any, i: number) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{i + 1}</Badge>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">by {product.sellerName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-green-600">{formatCurrency(product.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{product.quantitySold} sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Distribution + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User Distribution</CardTitle>
              <CardDescription>Users across different roles</CardDescription>
            </CardHeader>
            <CardContent>
              {usersByRole.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No user data</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={usersByRole.map((r: any) => ({ name: r.role, value: r.count }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {usersByRole.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Summary</CardTitle>
              <CardDescription>Key platform indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Package className="mx-auto h-6 w-6 text-blue-600 mb-2" />
                  <div className="text-xl font-bold">{summary.totalProducts}</div>
                  <div className="text-xs text-muted-foreground">Total Products</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Users className="mx-auto h-6 w-6 text-green-600 mb-2" />
                  <div className="text-xl font-bold">{summary.totalUsers}</div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <ShoppingCart className="mx-auto h-6 w-6 text-purple-600 mb-2" />
                  <div className="text-xl font-bold">{summary.totalOrders}</div>
                  <div className="text-xs text-muted-foreground">Total Orders</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <DollarSign className="mx-auto h-6 w-6 text-orange-600 mb-2" />
                  <div className="text-xl font-bold">{formatCurrency(summary.avgOrderValue)}</div>
                  <div className="text-xs text-muted-foreground">Avg Order Value</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
