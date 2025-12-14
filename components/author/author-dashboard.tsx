'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  PenTool,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  BarChart3,
  Users,
  Calendar,
  Edit,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DashboardData {
  hasProfile: boolean;
  profile?: {
    id: string;
    displayName: string;
    username: string;
    bio?: string;
    avatarUrl?: string;
    isVerified: boolean;
    totalPosts: number;
    totalViews: number;
    totalLikes: number;
  };
  stats?: {
    totalPosts: number;
    totalViews: number;
    totalLikes: number;
    drafts: number;
    pending: number;
    published: number;
    rejected: number;
  };
  social?: {
    followers: number;
    following: number;
  };
  recentPosts?: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    viewCount: number;
    publishedAt?: string;
    rejectionReason?: string;
    _count: {
      likedBy: number;
      comments: number;
    };
  }>;
  recentComments?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author?: {
      id: string;
      name: string;
      avatar?: string;
    };
    post: {
      id: string;
      title: string;
      slug: string;
    };
  }>;
  popularPosts?: Array<{
    id: string;
    title: string;
    slug: string;
    viewCount: number;
    _count: {
      likedBy: number;
    };
  }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: FileText },
  PENDING_APPROVAL: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
  PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle },
  ARCHIVED: { label: 'Archived', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200', icon: FileText },
};

export default function AuthorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/author/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchDashboardData}>Try Again</Button>
      </div>
    );
  }

  if (!data?.hasProfile) {
    return <CreateProfilePrompt />;
  }

  const { profile, stats, social, recentPosts, recentComments, popularPosts } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl shadow-xl dark:bg-slate-900/80"
        style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(255,255,255,0.98) 100%)' }}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))', filter: 'blur(8px)' }} />
            <Avatar className="h-16 w-16 ring-4 ring-white dark:ring-slate-800 shadow-lg relative">
              <AvatarImage src={profile?.avatarUrl || ''} alt={profile?.displayName} />
              <AvatarFallback className="text-lg font-bold" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))' }}>
                {profile?.displayName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {profile?.isVerified && (
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-slate-800 shadow-md">
                <CheckCircle className="h-4 w-4" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Welcome, <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">{profile?.displayName}</span>
              {profile?.isVerified && (
                <Badge className="gap-1 border-0 shadow-md" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'rgba(16, 185, 129, 0.9)' }}>
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">@{profile?.username}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            asChild 
            variant="outline"
            className="border-0 shadow-md hover:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
            style={{ background: 'rgba(255,255,255,0.9)' }}
          >
            <Link href="/author/profile/edit">
              <Edit className="h-4 w-4 mr-2" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
              Edit Profile
            </Link>
          </Button>
          <Button 
            asChild
            className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))' }}
          >
            <Link href="/author/posts/new">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatsCard
          title="Total Posts"
          value={stats?.totalPosts || 0}
          icon={FileText}
          trend={stats?.published ? `${stats.published} published` : undefined}
        />
        <StatsCard
          title="Total Views"
          value={stats?.totalViews || 0}
          icon={Eye}
          format="compact"
        />
        <StatsCard
          title="Total Likes"
          value={stats?.totalLikes || 0}
          icon={Heart}
        />
        <StatsCard
          title="Followers"
          value={social?.followers || 0}
          icon={Users}
        />
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="bg-gradient-to-br border-0 shadow-lg hover:shadow-xl transition-all duration-300 dark:bg-slate-900/80" style={{ background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1), rgba(255,255,255,0.95))' }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(156, 163, 175, 0.2)' }}>
              <FileText className="h-5 w-5" style={{ color: 'rgba(107, 114, 128, 0.9)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{stats?.drafts || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Drafts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 dark:bg-slate-900/80" style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(255,255,255,0.95))' }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.2)' }}>
              <Clock className="h-5 w-5" style={{ color: 'rgba(234, 179, 8, 0.9)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'rgba(161, 98, 7, 0.9)' }}>{stats?.pending || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 dark:bg-slate-900/80" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(255,255,255,0.95))' }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
              <CheckCircle className="h-5 w-5" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'rgba(16, 185, 129, 0.9)' }}>{stats?.published || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 dark:bg-slate-900/80" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(255,255,255,0.95))' }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
              <XCircle className="h-5 w-5" style={{ color: 'rgba(239, 68, 68, 0.9)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'rgba(239, 68, 68, 0.9)' }}>{stats?.rejected || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid lg:grid-cols-3 gap-6"
      >
        {/* Recent Posts */}
        <Card className="lg:col-span-2 border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.98)' }}>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgba(59, 130, 246, 0.7), rgba(249, 115, 22, 0.7))' }} />
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                Recent Posts
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">Your latest blog posts</CardDescription>
            </div>
            <Button 
              asChild 
              variant="ghost" 
              size="sm"
              className="hover:bg-transparent"
              style={{ color: 'rgba(16, 185, 129, 0.8)' }}
            >
              <Link href="/author/posts">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentPosts && recentPosts.length > 0 ? (
              <div className="space-y-4">
                {recentPosts.map((post, index) => {
                  const status = statusConfig[post.status] || statusConfig.DRAFT;
                  const StatusIcon = status.icon;
                  const statusColors: Record<string, string> = {
                    DRAFT: 'rgba(156, 163, 175, 0.1)',
                    PENDING_APPROVAL: 'rgba(234, 179, 8, 0.08)',
                    APPROVED: 'rgba(16, 185, 129, 0.08)',
                    PUBLISHED: 'rgba(16, 185, 129, 0.08)',
                    REJECTED: 'rgba(239, 68, 68, 0.08)',
                    ARCHIVED: 'rgba(107, 114, 128, 0.08)',
                  };
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-start justify-between p-4 rounded-xl border-0 shadow-sm hover:shadow-md transition-all duration-200 dark:bg-slate-800/50"
                      style={{ background: statusColors[post.status] || 'rgba(255,255,255,0.9)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          href={
                            post.status === 'PUBLISHED'
                              ? `/blog/${post.slug}`
                              : `/author/posts/${post.id}/edit`
                          }
                          className="font-medium hover:text-emerald-600 line-clamp-1 transition-colors"
                        >
                          {post.title}
                        </Link>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          <Badge variant="secondary" className={`${status.color} text-xs border-0 shadow-sm`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          {post.status === 'PUBLISHED' && (
                            <>
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                <Eye className="h-3 w-3" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                                <span style={{ color: 'rgba(59, 130, 246, 0.9)' }}>{post.viewCount}</span>
                              </span>
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
                                <Heart className="h-3 w-3" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
                                <span style={{ color: 'rgba(249, 115, 22, 0.9)' }}>{post._count.likedBy}</span>
                              </span>
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                                <MessageCircle className="h-3 w-3" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                                <span style={{ color: 'rgba(139, 92, 246, 0.9)' }}>{post._count.comments}</span>
                              </span>
                            </>
                          )}
                        </div>
                        {post.status === 'REJECTED' && post.rejectionReason && (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-400 p-2 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                            <strong>Rejection reason:</strong> {post.rejectionReason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {post.status === 'PUBLISHED' && (
                          <Button 
                            asChild 
                            size="sm" 
                            variant="ghost"
                            className="hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          >
                            <Link href={`/blog/${post.slug}`}>
                              <ExternalLink className="h-4 w-4" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                            </Link>
                          </Button>
                        )}
                        <Button 
                          asChild 
                          size="sm" 
                          variant="ghost"
                          className="hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                        >
                          <Link href={`/author/posts/${post.id}/edit`}>
                            <Edit className="h-4 w-4" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                          </Link>
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto mb-4 p-4 rounded-full w-fit" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                  <PenTool className="h-12 w-12" style={{ color: 'rgba(16, 185, 129, 0.5)' }} />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">No posts yet. Start writing!</p>
                <Button 
                  asChild 
                  className="shadow-lg"
                  style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))' }}
                >
                  <Link href="/author/posts/new">Create Your First Post</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Comments */}
          <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.98)' }}>
            <div className="h-1" style={{ background: 'rgba(139, 92, 246, 0.6)' }} />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                Recent Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentComments && recentComments.length > 0 ? (
                <div className="space-y-4">
                  {recentComments.slice(0, 5).map((comment, index) => (
                    <motion.div 
                      key={comment.id} 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex gap-3 p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-800 shadow-sm">
                        <AvatarImage src={comment.author?.avatar || ''} />
                        <AvatarFallback style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                          {comment.author?.name?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium" style={{ color: 'rgba(139, 92, 246, 0.9)' }}>{comment.author?.name || 'Anonymous'}</span>
                          {' commented on '}
                          <Link
                            href={`/blog/${comment.post.slug}`}
                            className="font-medium hover:text-emerald-600 transition-colors"
                          >
                            {comment.post.title}
                          </Link>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2" style={{ color: 'rgba(139, 92, 246, 0.3)' }} />
                  <p className="text-sm text-gray-400">No comments yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Popular Posts */}
          <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.98)' }}>
            <div className="h-1" style={{ background: 'rgba(249, 115, 22, 0.6)' }} />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
                Top Performing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {popularPosts && popularPosts.length > 0 ? (
                <div className="space-y-3">
                  {popularPosts.slice(0, 5).map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <Link
                        href={`/blog/${post.slug}`}
                        className="flex items-start gap-3 group p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      >
                        <span 
                          className="flex-shrink-0 w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center shadow-sm"
                          style={{ 
                            background: index === 0 ? 'rgba(249, 115, 22, 0.2)' : index === 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: index === 0 ? 'rgba(249, 115, 22, 0.9)' : index === 1 ? 'rgba(59, 130, 246, 0.9)' : 'rgba(16, 185, 129, 0.9)'
                          }}
                        >
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2 group-hover:text-orange-600 transition-colors">
                            {post.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            <span style={{ color: 'rgba(59, 130, 246, 0.8)' }}>{post.viewCount} views</span>
                            {' • '}
                            <span style={{ color: 'rgba(249, 115, 22, 0.8)' }}>{post._count.likedBy} likes</span>
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" style={{ color: 'rgba(249, 115, 22, 0.3)' }} />
                  <p className="text-sm text-gray-400">No published posts yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.98)' }}>
            <div className="h-1" style={{ background: 'rgba(16, 185, 129, 0.6)' }} />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                asChild 
                variant="outline" 
                className="w-full justify-start border-0 shadow-sm hover:shadow-md transition-all duration-200"
                style={{ background: 'rgba(16, 185, 129, 0.08)' }}
              >
                <Link href="/author/posts/new">
                  <Plus className="h-4 w-4 mr-2" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                  <span style={{ color: 'rgba(16, 185, 129, 0.9)' }}>Write New Post</span>
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                className="w-full justify-start border-0 shadow-sm hover:shadow-md transition-all duration-200"
                style={{ background: 'rgba(59, 130, 246, 0.08)' }}
              >
                <Link href="/author/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                  <span style={{ color: 'rgba(59, 130, 246, 0.9)' }}>View Analytics</span>
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                className="w-full justify-start border-0 shadow-sm hover:shadow-md transition-all duration-200"
                style={{ background: 'rgba(249, 115, 22, 0.08)' }}
              >
                <Link href={`/author/${profile?.username}`}>
                  <ExternalLink className="h-4 w-4 mr-2" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
                  <span style={{ color: 'rgba(249, 115, 22, 0.9)' }}>View Public Profile</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  format = 'number'
}: {
  title: string;
  value: number;
  icon: typeof Eye;
  trend?: string;
  format?: 'number' | 'compact';
}) {
  const formattedValue = format === 'compact' && value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : value.toLocaleString();

  // Dynamic color based on icon type
  const getIconColors = () => {
    switch (Icon) {
      case FileText:
        return { bg: 'rgba(16, 185, 129, 0.15)', color: 'rgba(16, 185, 129, 0.9)', gradient: 'rgba(16, 185, 129, 0.05)' };
      case Eye:
        return { bg: 'rgba(59, 130, 246, 0.15)', color: 'rgba(59, 130, 246, 0.9)', gradient: 'rgba(59, 130, 246, 0.05)' };
      case Heart:
        return { bg: 'rgba(249, 115, 22, 0.15)', color: 'rgba(249, 115, 22, 0.9)', gradient: 'rgba(249, 115, 22, 0.05)' };
      case Users:
        return { bg: 'rgba(139, 92, 246, 0.15)', color: 'rgba(139, 92, 246, 0.9)', gradient: 'rgba(139, 92, 246, 0.05)' };
      default:
        return { bg: 'rgba(16, 185, 129, 0.15)', color: 'rgba(16, 185, 129, 0.9)', gradient: 'rgba(16, 185, 129, 0.05)' };
    }
  };

  const colors = getIconColors();

  return (
    <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ background: `linear-gradient(135deg, ${colors.gradient} 0%, rgba(255,255,255,0.95) 100%)` }}>
      <div className="h-1" style={{ background: colors.color }} />
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: colors.color }}>{formattedValue}</p>
            {trend && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 rounded-xl" style={{ background: colors.bg }}>
            <Icon className="h-6 w-6" style={{ color: colors.color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateProfilePrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-lg"
      >
        {/* Decorative Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4), transparent)' }} />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4), transparent)' }} />
        </div>
        
        {/* Icon Container */}
        <div className="relative mx-auto mb-8">
          <div className="absolute inset-0 rounded-full animate-pulse" style={{ 
            background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3), rgba(249, 115, 22, 0.3), rgba(16, 185, 129, 0.3))',
            width: '96px',
            height: '96px',
            filter: 'blur(8px)'
          }} />
          <div className="relative p-6 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15))' }}>
            <div className="p-4 rounded-full bg-white dark:bg-gray-900 shadow-xl">
              <PenTool className="h-10 w-10" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-emerald-600 via-blue-600 to-orange-500 bg-clip-text text-transparent">
          Start Your Blogging Journey
        </h1>
        <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
          Create your author profile to start sharing your expertise with the poultry community.
          Build your personal brand and connect with readers.
        </p>
        
        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: FileText, label: 'Publish Articles', color: '16, 185, 129' },
            { icon: BarChart3, label: 'Track Analytics', color: '59, 130, 246' },
            { icon: Users, label: 'Build Audience', color: '249, 115, 22' }
          ].map((feature, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: `rgba(${feature.color}, 0.1)` }}>
              <feature.icon className="h-6 w-6 mx-auto mb-2" style={{ color: `rgba(${feature.color}, 0.8)` }} />
              <p className="text-xs font-medium" style={{ color: `rgba(${feature.color}, 0.9)` }}>{feature.label}</p>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="px-8" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))' }}>
            <Link href="/author/profile/edit">
              Create Author Profile
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8">
            <Link href="/blog">
              Browse Blog
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(249, 115, 22, 0.05) 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.5)' }} />
          </div>
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))' }} />
            <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
          <div className="h-10 w-28 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4))' }} />
        </div>
      </div>
      
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { color1: '16, 185, 129', color2: '16, 185, 129' },
          { color1: '59, 130, 246', color2: '59, 130, 246' },
          { color1: '249, 115, 22', color2: '249, 115, 22' },
          { color1: '139, 92, 246', color2: '139, 92, 246' }
        ].map((colors, i) => (
          <Card key={i} className="overflow-hidden border-0 shadow-lg" style={{ background: `linear-gradient(135deg, rgba(${colors.color1}, 0.05) 0%, rgba(255,255,255,0.9) 100%)` }}>
            <div className="h-1" style={{ background: `rgba(${colors.color1}, 0.5)` }} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-20 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                  <div className="h-7 w-16 rounded-lg animate-pulse" style={{ background: `rgba(${colors.color1}, 0.25)` }} />
                </div>
                <div className="h-12 w-12 rounded-full animate-pulse" style={{ background: `rgba(${colors.color1}, 0.15)` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Quick Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { bg: 'rgba(156, 163, 175, 0.15)', icon: 'rgba(156, 163, 175, 0.3)' },
          { bg: 'rgba(234, 179, 8, 0.1)', icon: 'rgba(234, 179, 8, 0.25)' },
          { bg: 'rgba(16, 185, 129, 0.1)', icon: 'rgba(16, 185, 129, 0.25)' },
          { bg: 'rgba(239, 68, 68, 0.1)', icon: 'rgba(239, 68, 68, 0.25)' }
        ].map((style, i) => (
          <Card key={i} className="border-0" style={{ background: style.bg }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg animate-pulse" style={{ background: style.icon, width: '40px', height: '40px' }} />
              <div className="space-y-1">
                <div className="h-6 w-8 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.15)' }} />
                <div className="h-3 w-14 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Main Content Grid Skeleton */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Posts Skeleton */}
        <Card className="lg:col-span-2 border-0 shadow-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgba(59, 130, 246, 0.7), rgba(249, 115, 22, 0.7))' }} />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-2">
              <div className="h-6 w-32 rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
              <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div className="h-8 w-20 rounded animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.15)' }} />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg animate-pulse" style={{ background: `rgba(${i % 2 === 0 ? '16, 185, 129' : '59, 130, 246'}, 0.05)` }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                    <div className="flex gap-2">
                      <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: `rgba(${i % 3 === 0 ? '16, 185, 129' : i % 3 === 1 ? '234, 179, 8' : '59, 130, 246'}, 0.2)` }} />
                      <div className="h-5 w-20 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          {/* Popular Posts Skeleton */}
          <Card className="border-0 shadow-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <div className="h-1" style={{ background: 'rgba(249, 115, 22, 0.6)' }} />
            <CardHeader className="pb-2">
              <div className="h-6 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.2)' }} />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-lg" style={{ background: 'rgba(249, 115, 22, 0.05)' }}>
                  <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                  <div className="h-4 w-12 rounded animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.2)' }} />
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Quick Actions Skeleton */}
          <Card className="border-0 shadow-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <div className="h-1" style={{ background: 'rgba(59, 130, 246, 0.6)' }} />
            <CardHeader className="pb-2">
              <div className="h-6 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: `rgba(${i === 1 ? '16, 185, 129' : i === 2 ? '59, 130, 246' : '249, 115, 22'}, 0.1)` }} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
