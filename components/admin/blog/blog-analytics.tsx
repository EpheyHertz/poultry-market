'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  ThumbsUp,
  MessageCircle,
  Users,
  BookOpen,
  Calendar,
  Target,
  Award,
  Activity,
  RefreshCw
} from 'lucide-react';

interface BlogAnalytics {
  overview: {
    totalPosts: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalSubscribers: number;
    avgReadingTime: number;
    publishedThisMonth: number;
    viewsThisMonth: number;
  };
  topPosts: Array<{
    id: string;
    title: string;
    slug: string;
    views: number;
    likes: number;
    comments: number;
    publishedAt: string;
  }>;
  categoryStats: Array<{
    category: string;
    count: number;
    views: number;
  }>;
  monthlyData: Array<{
    month: string;
    posts: number;
    views: number;
    likes: number;
  }>;
  engagementData: Array<{
    date: string;
    views: number;
    likes: number;
    comments: number;
  }>;
}

export default function BlogAnalytics() {
  const [analytics, setAnalytics] = useState<BlogAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/blog/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching blog analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const categoryColors = [
    '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
    '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Blog Analytics</h1>
          <Button disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Unable to load analytics</h3>
        <p className="text-gray-500 mb-4">There was a problem fetching your blog analytics data.</p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const overviewCards = [
    {
      title: 'Total Posts',
      value: analytics.overview.totalPosts,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: `+${analytics.overview.publishedThisMonth} this month`
    },
    {
      title: 'Total Views',
      value: analytics.overview.totalViews,
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: `+${formatNumber(analytics.overview.viewsThisMonth)} this month`
    },
    {
      title: 'Total Likes',
      value: analytics.overview.totalLikes,
      icon: ThumbsUp,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: '+12% from last month'
    },
    {
      title: 'Total Comments',
      value: analytics.overview.totalComments,
      icon: MessageCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+8% from last month'
    },
    {
      title: 'Newsletter Subscribers',
      value: analytics.overview.totalSubscribers,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '+15% from last month'
    },
    {
      title: 'Avg. Reading Time',
      value: `${analytics.overview.avgReadingTime}m`,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: 'Optimal engagement'
    },
    {
      title: 'Engagement Rate',
      value: '8.2%',
      icon: Target,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      change: '+2.1% from last month'
    },
    {
      title: 'SEO Score',
      value: '92/100',
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      change: 'Excellent performance'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Analytics</h1>
          <p className="text-gray-600 mt-1">Track your blog performance and engagement metrics</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {card.change}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Monthly Performance
            </CardTitle>
            <CardDescription>Posts published and views over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="posts" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Posts Published"
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Total Views"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Content Categories
            </CardTitle>
            <CardDescription>Distribution of posts by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.categoryStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, count }) => `${category}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.categoryStats.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={categoryColors[index % categoryColors.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Top Performing Posts
          </CardTitle>
          <CardDescription>Your most popular blog posts by engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topPosts.map((post, index) => (
              <div key={post.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {post.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Published on {formatDate(post.publishedAt)}
                  </p>
                </div>
                
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{formatNumber(post.views)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{formatNumber(post.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{formatNumber(post.comments)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Engagement Trends
          </CardTitle>
          <CardDescription>Daily engagement metrics over the past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => formatDate(value)}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => formatDate(value)}
              />
              <Legend />
              <Bar dataKey="views" fill="#10B981" name="Views" />
              <Bar dataKey="likes" fill="#F59E0B" name="Likes" />
              <Bar dataKey="comments" fill="#8B5CF6" name="Comments" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}