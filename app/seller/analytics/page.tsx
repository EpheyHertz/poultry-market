'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  ShoppingCart, 
  Package, 
  TrendingUp,
  Star,
  Users,
  Repeat,
  Store,
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

export default function SellerAnalytics() {
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
          if (userData.role !== 'SELLER' && userData.role !== 'COMPANY') {
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
      const response = await fetch(`/api/analytics/enhanced?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

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

  const { summary, revenueChart, topProducts } = analytics;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

  const stats = [
    {
      title: 'Total Revenue',
      value: formatCurrency(summary.totalRevenue),
      icon: DollarSign,
      description: `Online: ${formatCurrency(summary.onlineRevenue)} | POS: ${formatCurrency(summary.posRevenue)}`,
      color: 'text-green-600'
    },
    {
      title: 'Order Count',
      value: summary.orderCount,
      icon: ShoppingCart,
      description: `Online: ${summary.onlineOrderCount} | POS: ${summary.posSaleCount}`,
      color: 'text-blue-600'
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(summary.averageOrderValue),
      icon: TrendingUp,
      description: 'Per transaction',
      color: 'text-purple-600'
    },
    {
      title: 'Conversion Rate',
      value: `${summary.conversionRate}%`,
      icon: Repeat,
      description: `${summary.repeatCustomers} repeat of ${summary.uniqueCustomers} customers`,
      color: 'text-orange-600'
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Revenue, products, and customer insights</p>
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
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>Online orders vs POS sales</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueChart.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>No revenue data for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'online' ? 'Online' : name === 'pos' ? 'POS' : 'Total'
                    ]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-KE', {
                      weekday: 'short', month: 'short', day: 'numeric'
                    })}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="online" stackId="1" stroke="#0088FE" fill="#0088FE" fillOpacity={0.4} name="Online" />
                  <Area type="monotone" dataKey="pos" stackId="1" stroke="#00C49F" fill="#00C49F" fillOpacity={0.4} name="POS" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products & Customer Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Best-Selling Products</CardTitle>
              <CardDescription>By quantity sold (online + POS combined)</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-2" />
                  <p>No sales data yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.slice(0, 8).map((product: any, index: number) => (
                    <div key={product.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-muted-foreground w-6 text-center">{index + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(product.price)} each</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{product.quantitySold} sold</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Product</CardTitle>
              <CardDescription>Sales distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topProducts.slice(0, 6).map((product: any, index: number) => ({
                        name: product.name.length > 15 ? product.name.slice(0, 15) + '...' : product.name,
                        value: product.revenue,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {topProducts.slice(0, 6).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Key business indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Users className="mx-auto h-6 w-6 text-blue-600 mb-2" />
                <div className="text-xl font-bold">{summary.uniqueCustomers}</div>
                <div className="text-xs text-muted-foreground">Unique Customers</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Repeat className="mx-auto h-6 w-6 text-green-600 mb-2" />
                <div className="text-xl font-bold">{summary.repeatCustomers}</div>
                <div className="text-xs text-muted-foreground">Repeat Customers</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Star className="mx-auto h-6 w-6 text-yellow-500 mb-2" />
                <div className="text-xl font-bold">{summary.averageRating || 'N/A'}</div>
                <div className="text-xs text-muted-foreground">Avg Rating ({summary.reviewCount} reviews)</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Store className="mx-auto h-6 w-6 text-purple-600 mb-2" />
                <div className="text-xl font-bold">{summary.posSaleCount}</div>
                <div className="text-xs text-muted-foreground">POS Sales</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}