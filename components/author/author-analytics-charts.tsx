'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageCircle,
  Calendar,
  Clock,
  Users,
  FileText,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  overview: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalPosts: number;
    totalFollowers: number;
    viewsChange: number;
    likesChange: number;
    commentsChange: number;
  };
  viewsOverTime: Array<{
    date: string;
    views: number;
  }>;
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    views: number;
  }>;
  engagementRate: number;
  avgReadTime: number;
}

interface AuthorAnalyticsChartsProps {
  data?: AnalyticsData | null;
  loading?: boolean;
  className?: string;
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-gray-500',
  description
}: {
  title: string;
  value: number | string;
  change?: number;
  icon: typeof Eye;
  iconColor?: string;
  description?: string;
}) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
            {change !== undefined && (
              <div className={cn(
                'flex items-center gap-1 text-xs mt-1',
                isPositive && 'text-green-600',
                isNegative && 'text-red-600',
                !isPositive && !isNegative && 'text-muted-foreground'
              )}>
                {isPositive && <ArrowUpRight className="h-3 w-3" />}
                {isNegative && <ArrowDownRight className="h-3 w-3" />}
                <span>{isPositive && '+'}{change.toFixed(1)}% from last period</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-lg bg-gray-100 dark:bg-gray-800', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple Bar Chart Component (no external library)
function SimpleBarChart({ data, maxValue }: { data: Array<{ label: string; value: number }>; maxValue?: number }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground truncate max-w-[60%]">{item.label}</span>
            <span className="font-medium">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Views Timeline Component
function ViewsTimeline({ data }: { data: Array<{ date: string; views: number }> }) {
  const maxViews = Math.max(...data.map(d => d.views), 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((item, index) => {
        const height = (item.views / maxViews) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-emerald-500 rounded-t transition-all duration-300 hover:bg-emerald-600"
              style={{ height: `${Math.max(height, 4)}%` }}
              title={`${item.date}: ${item.views} views`}
            />
            <span className="text-[10px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
              {item.date}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AuthorAnalyticsCharts({
  data,
  loading = false,
  className
}: AuthorAnalyticsChartsProps) {
  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No analytics data available yet.</p>
          <p className="text-sm mt-1">Start publishing posts to see your stats!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Views"
          value={data.overview.totalViews}
          change={data.overview.viewsChange}
          icon={Eye}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Total Likes"
          value={data.overview.totalLikes}
          change={data.overview.likesChange}
          icon={Heart}
          iconColor="text-red-500"
        />
        <StatCard
          title="Comments"
          value={data.overview.totalComments}
          change={data.overview.commentsChange}
          icon={MessageCircle}
          iconColor="text-purple-500"
        />
        <StatCard
          title="Followers"
          value={data.overview.totalFollowers}
          icon={Users}
          iconColor="text-emerald-500"
        />
      </div>

      {/* Engagement Metrics */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Engagement Rate
            </CardTitle>
            <CardDescription>Interactions per view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {data.engagementRate.toFixed(2)}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Based on likes and comments relative to views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Average Read Time
            </CardTitle>
            <CardDescription>Time spent on your posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(data.avgReadTime / 60)} min
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Average reading duration per visit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Views Over Time */}
      {data.viewsOverTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Views Over Time
            </CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ViewsTimeline data={data.viewsOverTime} />
          </CardContent>
        </Card>
      )}

      {/* Top Posts & Category Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Top Performing Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topPosts.length > 0 ? (
              <div className="space-y-4">
                {data.topPosts.slice(0, 5).map((post, index) => (
                  <div key={post.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {post.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> {post.comments}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No posts yet</p>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Posts by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length > 0 ? (
              <SimpleBarChart
                data={data.categoryBreakdown.map(c => ({
                  label: c.category.replace(/_/g, ' '),
                  value: c.count
                }))}
              />
            ) : (
              <p className="text-muted-foreground text-sm">No category data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
