'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import DashboardLayout from '@/components/layout/dashboard-layout';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  Star,
  Archive,
  FileText,
  BarChart3,
  Activity,
  RefreshCw,
  Grid3x3,
  List,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  PauseCircle,
  Users,
  MessageSquare,
  Heart,
  Calendar,
  TrendingUp,
  Zap,
  BookOpen,
  PenTool,
  Award,
  Target,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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
  const [deletePostSlug, setDeletePostSlug] = useState<string | null>(null);

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

      const response = await fetch(`/api/admin/blog/posts?${params}`);
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
    try {
      const response = await fetch(`/api/blog/posts/${slug}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Post deleted successfully');
        fetchPosts(currentPage, searchTerm, statusFilter, categoryFilter);
        fetchStats();
        setDeletePostSlug(null);
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

  // Get category display
  const getCategoryDisplay = (category: string) => {
    const categoryInfo = BLOG_CATEGORIES[category as keyof typeof BLOG_CATEGORIES];
    return categoryInfo ? (
      <Badge className={categoryInfo.color}>
        <span className="mr-1">{categoryInfo.icon}</span>
        {categoryInfo.name}
      </Badge>
    ) : (
      <Badge variant="outline">{category}</Badge>
    );
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    const statusInfo = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!statusInfo) return null;
    
    const Icon = statusInfo.icon;
    return (
      <Badge className={statusInfo.color}>
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Blog Management</h1>
            <p className="text-gray-600 mt-1">Manage your blog posts, categories, and content</p>
          </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button onClick={() => router.push('/admin/blog/pending')} variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Pending Reviews</span>
              <span className="sm:hidden">Reviews</span>
            </Button>
            <Button onClick={() => router.push('/admin/blog/new')} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Post</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-gray-100 rounded-lg">
            <TabsTrigger value="overview" className="flex flex-col items-center gap-1 px-2 py-3 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex flex-col items-center gap-1 px-2 py-3 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex flex-col items-center gap-1 px-2 py-3 text-xs sm:text-sm">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Data</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total Posts</p>
                        <p className="text-2xl sm:text-3xl font-bold text-blue-900">
                          {statsLoading ? '...' : stats?.totalPosts || 0}
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Published</p>
                        <p className="text-2xl sm:text-3xl font-bold text-green-900">
                          {statsLoading ? '...' : stats?.publishedPosts || 0}
                        </p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Total Views</p>
                        <p className="text-2xl sm:text-3xl font-bold text-purple-900">
                          {statsLoading ? '...' : stats?.totalViews?.toLocaleString() || 0}
                        </p>
                      </div>
                      <Eye className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">Comments</p>
                        <p className="text-2xl sm:text-3xl font-bold text-orange-900">
                          {statsLoading ? '...' : stats?.totalComments || 0}
                        </p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

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
                <div className="space-y-4">
                  {statsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                        </div>
                      </div>
                    ))
                  ) : stats?.recentActivity?.length ? (
                    stats.recentActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {activity.type === 'post_published' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <PenTool className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            by {activity.author} • {formatDate(activity.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-6 mt-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-center">
                  <div className="flex-1 space-y-4 sm:space-y-0 sm:flex sm:space-x-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search posts..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-10"
                      />
                    </div>
                    
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => {
                        setStatusFilter(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={categoryFilter}
                      onValueChange={(value) => {
                        setCategoryFilter(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Object.entries(BLOG_CATEGORIES).map(([key, category]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <span>{category.icon}</span>
                              {category.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    >
                      {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPosts(currentPage, searchTerm, statusFilter, categoryFilter)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            <AnimatePresence>
              {selectedPosts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                        <p className="text-sm font-medium text-blue-900">
                          {selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''} selected
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => handleBulkAction('publish')} className="bg-green-600 hover:bg-green-700">
                            Publish
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleBulkAction('draft')}>
                            Draft
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleBulkAction('feature')}>
                            Feature
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>
                            Archive
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Posts List/Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="w-full h-48 bg-gray-200 animate-pulse" />
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                        <div className="flex space-x-2">
                          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
                  <p className="text-gray-600 mb-6">Get started by creating your first blog post.</p>
                  <Button onClick={() => router.push('/admin/blog/new')} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center p-3 border-b">
                        <Checkbox
                          checked={selectedPosts.includes(post.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPosts([...selectedPosts, post.id]);
                            } else {
                              setSelectedPosts(selectedPosts.filter(id => id !== post.id));
                            }
                          }}
                        />
                        <div className="ml-auto flex items-center space-x-2">
                          {post.featured && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/blog/${post.author.name.replace(/\s+/g, '-').toLowerCase()}/${post.slug}`} target="_blank">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/blog/edit/${post.slug}`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeletePostSlug(post.slug)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {viewMode === 'grid' ? (
                        <>
                          <div className="relative h-48 overflow-hidden">
                            {post.featuredImage ? (
                              <Image
                                src={post.featuredImage}
                                alt={post.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <FileText className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute top-3 left-3 flex space-x-2">
                              {getStatusDisplay(post.status)}
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-emerald-600 transition-colors">
                                {post.title}
                              </h3>
                              
                              {post.excerpt && (
                                <p className="text-gray-600 text-sm line-clamp-2">{post.excerpt}</p>
                              )}

                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>By {post.author.name}</span>
                                <span>{formatDate(post.createdAt)}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                {getCategoryDisplay(post.category)}
                                <div className="flex items-center space-x-3 text-gray-500">
                                  <span className="flex items-center">
                                    <Eye className="h-3 w-3 mr-1" />
                                    {post.viewCount}
                                  </span>
                                  <span className="flex items-center">
                                    <Heart className="h-3 w-3 mr-1" />
                                    {post._count.likes}
                                  </span>
                                  <span className="flex items-center">
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    {post._count.comments}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </>
                      ) : (
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 w-20 h-20 overflow-hidden rounded-lg">
                              {post.featuredImage ? (
                                <Image
                                  src={post.featuredImage}
                                  alt={post.title}
                                  width={80}
                                  height={80}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <FileText className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-lg truncate group-hover:text-emerald-600 transition-colors">
                                    {post.title}
                                  </h3>
                                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">{post.excerpt}</p>
                                  <div className="flex items-center space-x-4 mt-2">
                                    {getStatusDisplay(post.status)}
                                    {getCategoryDisplay(post.category)}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end space-y-2 ml-4">
                                  <div className="flex items-center space-x-3 text-gray-500 text-sm">
                                    <span className="flex items-center">
                                      <Eye className="h-3 w-3 mr-1" />
                                      {post.viewCount}
                                    </span>
                                    <span className="flex items-center">
                                      <Heart className="h-3 w-3 mr-1" />
                                      {post._count.likes}
                                    </span>
                                    <span className="flex items-center">
                                      <MessageSquare className="h-3 w-3 mr-1" />
                                      {post._count.comments}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    By {post.author.name} • {formatDate(post.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                    <p className="text-sm text-gray-700">
                      Showing {((pagination.currentPage - 1) * 12) + 1} to {Math.min(pagination.currentPage * 12, pagination.totalPosts)} of {pagination.totalPosts} posts
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={!pagination.hasPrevPage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Analytics Dashboard
                </CardTitle>
                <CardDescription>Detailed analytics and insights coming soon</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                  <p className="text-gray-600">Detailed analytics and reporting features are coming soon.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletePostSlug} onOpenChange={() => setDeletePostSlug(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Post</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this post? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletePostSlug && handleDeletePost(deletePostSlug)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Post
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}