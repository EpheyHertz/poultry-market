'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { DashboardContent, DashboardGrid, DashboardCard } from '@/components/layout/dashboard-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Users,
  User,
  FileText,
  MoreVertical,
  Image as ImageIcon,
  MessageCircle,
  Clock,
  TrendingUp,
  Heart,
  BarChart3,
  Grid3X3,
  List,
  Settings,
  Download,
  Upload,
  RefreshCw,
  ArrowUpRight,
  Activity,
  Target,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  category: string;
  featured: boolean;
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
  readingTime?: number;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  _count: {
    likes: number;
    comments: number;
  };
}

interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalComments: number;
  totalLikes: number;
  recentActivity: Array<{
    id: string;
    type: 'post_created' | 'post_published' | 'comment_added' | 'post_liked';
    message: string;
    timestamp: string;
    author?: string;
  }>;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const BLOG_CATEGORIES = {
  FARMING_TIPS: { name: 'Farming Tips', icon: '🌱', color: 'bg-green-100 text-green-800' },
  POULTRY_HEALTH: { name: 'Poultry Health', icon: '🏥', color: 'bg-red-100 text-red-800' },
  FEED_NUTRITION: { name: 'Feed & Nutrition', icon: '🌾', color: 'bg-yellow-100 text-yellow-800' },
  EQUIPMENT_GUIDES: { name: 'Equipment Guides', icon: '🔧', color: 'bg-gray-100 text-gray-800' },
  MARKET_TRENDS: { name: 'Market Trends', icon: '📈', color: 'bg-blue-100 text-blue-800' },
  SUCCESS_STORIES: { name: 'Success Stories', icon: '🏆', color: 'bg-orange-100 text-orange-800' },
  INDUSTRY_NEWS: { name: 'Industry News', icon: '📰', color: 'bg-purple-100 text-purple-800' },
  SEASONAL_ADVICE: { name: 'Seasonal Advice', icon: '🌤️', color: 'bg-cyan-100 text-cyan-800' },
  BEGINNER_GUIDES: { name: 'Beginner Guides', icon: '📚', color: 'bg-lime-100 text-lime-800' },
  ADVANCED_TECHNIQUES: { name: 'Advanced Techniques', icon: '🎯', color: 'bg-pink-100 text-pink-800' }
};

const STATUS_CONFIG = {
  DRAFT: { icon: PauseCircle, color: 'bg-gray-100 text-gray-800', label: 'Draft' },
  PENDING_APPROVAL: { icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  APPROVED: { icon: CheckCircle2, color: 'bg-green-100 text-green-800', label: 'Approved' },
  PUBLISHED: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800', label: 'Published' },
  REJECTED: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' },
  ARCHIVED: { icon: Archive, color: 'bg-gray-100 text-gray-600', label: 'Archived' }
};

export default function AdminBlogPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch current user
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
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  // Fetch blog stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/admin/blog/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch blog posts
  const fetchPosts = useCallback(async (page = 1, search = '', status = 'all', category = 'all') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(search && { search }),
        ...(status !== 'all' && { status }),
        ...(category !== 'all' && { category })
      });

      const response = await fetch(`/api/blog/posts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch posts');

      const data = await response.json();
      setPosts(data.posts || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }, [pagination]);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchPosts(currentPage, searchTerm, statusFilter, categoryFilter);
    }
  }, [user, currentPage, searchTerm, statusFilter, categoryFilter, fetchPosts]);

  // Delete post
  const handleDeletePost = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/blog/posts/${slug}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Post deleted successfully');
        fetchPosts(currentPage, searchTerm, statusFilter, categoryFilter);
        fetchStats();
      } else {
        throw new Error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedPosts.length === 0) {
      toast.error('Please select posts first');
      return;
    }

    try {
      const response = await fetch('/api/admin/blog/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, postIds: selectedPosts })
      });

      if (response.ok) {
        toast.success(`${action} applied to ${selectedPosts.length} posts`);
        setSelectedPosts([]);
        fetchPosts(currentPage, searchTerm, statusFilter, categoryFilter);
        fetchStats();
      }
    } catch (error) {
      console.error('Error applying bulk action:', error);
      toast.error('Failed to apply bulk action');
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardContent>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Blog Management</h1>
            <p className="text-gray-600 mt-1">Manage your blog posts, categories, and content</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Button onClick={() => router.push('/admin/blog/new')} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
            <Button variant="outline" onClick={() => fetchPosts(currentPage, searchTerm, statusFilter, categoryFilter)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:inline-flex mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Posts</span>
              <Badge variant="secondary" className="ml-1">{pagination.totalPosts}</Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <DashboardGrid>
              <DashboardCard>
                <Card>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                      <p className="text-3xl font-bold">{stats?.totalPosts || 0}</p>
                      {stats && <p className="text-xs text-muted-foreground">+12% from last month</p>}
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </CardContent>
                </Card>
              </DashboardCard>
              
              <DashboardCard>
                <Card>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Published</p>
                      <p className="text-3xl font-bold">{stats?.publishedPosts || 0}</p>
                      {stats && <p className="text-xs text-muted-foreground">+8% from last month</p>}
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                  </CardContent>
                </Card>
              </DashboardCard>
              
              <DashboardCard>
                <Card>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                      <p className="text-3xl font-bold">{stats?.totalViews || 0}</p>
                      {stats && <p className="text-xs text-muted-foreground">+24% from last month</p>}
                    </div>
                    <Eye className="h-8 w-8 text-muted-foreground" />
                  </CardContent>
                </Card>
              </DashboardCard>
              
              <DashboardCard>
                <Card>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Engagement</p>
                      <p className="text-3xl font-bold">{`${(stats?.totalLikes || 0) + (stats?.totalComments || 0)}`}</p>
                      {stats && <p className="text-xs text-muted-foreground">+15% from last month</p>}
                    </div>
                    <Heart className="h-8 w-8 text-muted-foreground" />
                  </CardContent>
                </Card>
              </DashboardCard>
            </DashboardGrid>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest blog activity and updates</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : stats?.recentActivity?.length ? (
                  <div className="space-y-4">
                    {stats.recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Target className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search posts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                        <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Object.entries(BLOG_CATEGORIES).map(([key, category]) => (
                          <SelectItem key={key} value={key}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* View Mode Toggle */}
                    <div className="flex border rounded-lg p-1">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="h-8 px-3"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="h-8 px-3"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedPosts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-lg p-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-sm font-medium text-emerald-800">
                    {selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('publish')}>
                      Publish
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>
                      Archive
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')} className="text-red-600 hover:text-red-700">
                      Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedPosts([])}>
                      Clear
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Posts Grid/List */}
            {loading ? (
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="h-48 bg-gray-200 animate-pulse"></div>
                    <CardContent className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3"></div>
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
                >
                  {posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                        {/* Featured Image */}
                        {post.featuredImage && viewMode === 'grid' && (
                          <div className="relative h-48 overflow-hidden">
                            <Image
                              src={post.featuredImage}
                              alt={post.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            {/* Selection Checkbox */}
                            <div className="absolute top-3 left-3">
                              <input
                                type="checkbox"
                                checked={selectedPosts.includes(post.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPosts([...selectedPosts, post.id]);
                                  } else {
                                    setSelectedPosts(selectedPosts.filter(id => id !== post.id));
                                  }
                                }}
                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                              />
                            </div>

                            {/* Status Badge */}
                            <div className="absolute top-3 right-3">
                              {(() => {
                                const statusConfig = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG];
                                const StatusIcon = statusConfig?.icon || AlertCircle;
                                return (
                                  <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusConfig?.label || post.status}
                                  </Badge>
                                );
                              })()}
                            </div>

                            {post.featured && (
                              <div className="absolute bottom-3 left-3">
                                <Badge className="bg-yellow-500 text-white">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              </div>
                            )}
                          </div>
                        )}

                        <CardContent className="p-4 space-y-3">
                          {/* Category and Selection for List View */}
                          <div className="flex items-center justify-between">
                            <Badge className={`${BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800'} text-xs`}>
                              {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name}
                            </Badge>
                            
                            {viewMode === 'list' && (
                              <input
                                type="checkbox"
                                checked={selectedPosts.includes(post.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPosts([...selectedPosts, post.id]);
                                  } else {
                                    setSelectedPosts(selectedPosts.filter(id => id !== post.id));
                                  }
                                }}
                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                              />
                            )}
                          </div>

                          {/* Title */}
                          <Link href={`/admin/blog/edit/${post.slug}`}>
                            <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2 cursor-pointer">
                              {post.title}
                            </h3>
                          </Link>

                          {/* Excerpt */}
                          {post.excerpt && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {post.excerpt}
                            </p>
                          )}

                          {/* Author */}
                          <div className="flex items-center space-x-2">
                            {post.author.avatar ? (
                              <Image
                                src={post.author.avatar}
                                alt={post.author.name}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                                <User className="h-3 w-3 text-emerald-600" />
                              </div>
                            )}
                            <span className="text-sm text-gray-600">{post.author.name}</span>
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-1">
                                <Eye className="h-3 w-3" />
                                <span>{post.viewCount}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Heart className="h-3 w-3" />
                                <span>{post._count.likes}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MessageCircle className="h-3 w-3" />
                                <span>{post._count.comments}</span>
                              </div>
                            </div>
                            <span>{formatDate(post.createdAt)}</span>
                          </div>

                          {/* Status for List View */}
                          {viewMode === 'list' && (
                            <div className="flex items-center justify-between pt-2 border-t">
                              {(() => {
                                const statusConfig = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG];
                                const StatusIcon = statusConfig?.icon || AlertCircle;
                                return (
                                  <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusConfig?.label || post.status}
                                  </Badge>
                                );
                              })()}
                              
                              <div className="flex items-center space-x-1">
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/blog/${post.slug}`} target="_blank">
                                    <Eye className="h-3 w-3" />
                                  </Link>
                                </Button>
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/admin/blog/edit/${post.slug}`}>
                                    <Edit className="h-3 w-3" />
                                  </Link>
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleDeletePost(post.slug)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Actions for Grid View */}
                          {viewMode === 'grid' && (
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="flex items-center space-x-1">
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/blog/${post.slug}`} target="_blank">
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Link>
                                </Button>
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/admin/blog/edit/${post.slug}`}>
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Link>
                                </Button>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleDeletePost(post.slug)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts found</h3>
                  <p className="text-gray-600 text-center mb-6">
                    {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                      ? 'Try adjusting your search or filters.'
                      : 'Get started by creating your first blog post.'
                    }
                  </p>
                  <Button onClick={() => router.push('/admin/blog/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Post
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  Showing {posts.length} of {pagination.totalPosts} posts
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-600 text-center mb-6">
                  Detailed analytics and insights coming soon.
                </p>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardContent>
    </DashboardLayout>
  );
}