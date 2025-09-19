'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Image from 'next/image';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  ArrowLeft,
  Search,
  Filter,
  Edit,
  Calendar,
  User,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Star,
  Tags,
  Image as ImageIcon,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus
} from 'lucide-react';

interface PendingBlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  images: string[];
  category: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
  submittedAt?: string;
  approvedAt?: string;
  publishedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  submissionNotes?: string;
  readingTime?: number;
  author: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  approvedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Summary {
  pending: number;
  approved: number;
  rejected: number;
  published: number;
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

export default function BlogPendingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<PendingBlogPost[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [summary, setSummary] = useState<Summary>({
    pending: 0,
    approved: 0,
    rejected: 0,
    published: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<PendingBlogPost | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [makeFeatured, setMakeFeatured] = useState(false);
  const [processing, setProcessing] = useState(false);

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

  // Fetch posts with status filter
  const fetchPosts = useCallback(async (page = 1, search = '', status?: string) => {
    try {
      setLoading(true);
      const actualStatus = status || statusFilter; // Use provided status or current filter
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status: actualStatus,
        ...(search && { search }),
      });

      const url = `/api/blog/pending?${params}`;
      console.log('Fetching posts from URL:', url); // Debug log
      console.log('Current statusFilter state:', statusFilter); // Debug log

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', {
        postsCount: data.posts?.length || 0,
        totalPosts: data.pagination?.totalPosts || 0,
        summary: data.summary
      }); // Debug log
      
      setPosts(data.posts || []);
      setPagination(data.pagination);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user) {
      fetchPosts(currentPage, searchTerm, statusFilter);
    }
  }, [currentPage, searchTerm, statusFilter, user, fetchPosts]);

  // Handle approval/rejection
  const handleApprovalAction = async (slug: string, action: 'approve' | 'reject') => {
    try {
      setProcessing(true);

      const requestData: any = {
        action,
        publishImmediately: action === 'approve' ? publishImmediately : false,
        featured: action === 'approve' ? makeFeatured : false,
      };

      if (action === 'reject' && rejectionReason.trim()) {
        requestData.rejectionReason = rejectionReason.trim();
      }

      const response = await fetch(`/api/blog/posts/${slug}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} post`);
      }

      const result = await response.json();
      
      toast.success(result.message);
      
      // Reset review mode and refresh data
      setReviewMode(false);
      setSelectedPost(null);
      setRejectionReason('');
      setPublishImmediately(false);
      setMakeFeatured(false);
      
      fetchPosts(currentPage, searchTerm, statusFilter);
    } catch (error) {
      console.error(`Error ${action}ing post:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} post`);
    } finally {
      setProcessing(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING_APPROVAL: { bg: 'bg-yellow-100 text-yellow-800', icon: Clock },
      APPROVED: { bg: 'bg-green-100 text-green-800', icon: CheckCircle },
      PUBLISHED: { bg: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      REJECTED: { bg: 'bg-red-100 text-red-800', icon: XCircle }
    };
    const config = styles[status as keyof typeof styles] || styles.PENDING_APPROVAL;
    const Icon = config.icon;
    
    return (
      <Badge className={config.bg}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
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

  // Show loading state while fetching user
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

  // Review mode - detailed view of a single post
  if (reviewMode && selectedPost) {
    return (
      <DashboardLayout user={user}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewMode(false)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to List</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Review Post</h1>
                <p className="text-gray-600 text-sm">Review and approve submitted blog post</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusBadge(selectedPost.status)}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Post Content */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex-1">
                      <CardTitle className="text-xl sm:text-2xl leading-tight">{selectedPost.title}</CardTitle>
                      {selectedPost.excerpt && (
                        <CardDescription className="mt-2 text-base">{selectedPost.excerpt}</CardDescription>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    {getCategoryDisplay(selectedPost.category)}
                    {selectedPost.tags.map(tag => (
                      <Badge key={tag.id} variant="outline" className="text-xs">
                        <Tags className="h-3 w-3 mr-1" />
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Featured Image */}
                  {selectedPost.featuredImage && (
                    <div className="relative h-64 sm:h-80 rounded-lg overflow-hidden">
                      <Image
                        src={selectedPost.featuredImage}
                        alt={selectedPost.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Content Preview */}
                  <div className="prose prose-sm sm:prose max-w-none">
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: selectedPost.content.substring(0, 1000) + (selectedPost.content.length > 1000 ? '...' : '') 
                      }} 
                    />
                  </div>

                  {/* Additional Images */}
                  {selectedPost.images && selectedPost.images.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Additional Images
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {selectedPost.images.map((image, index) => (
                          <div key={index} className="relative h-24 sm:h-32 rounded-lg overflow-hidden">
                            <Image
                              src={image}
                              alt={`Image ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submission Notes */}
                  {selectedPost.submissionNotes && (
                    <div>
                      <h4 className="font-medium mb-2">Submission Notes</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-800 text-sm">{selectedPost.submissionNotes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Author Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Author Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    {selectedPost.author.avatar ? (
                      <Image
                        src={selectedPost.author.avatar}
                        alt={selectedPost.author.name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{selectedPost.author.name}</p>
                      <p className="text-sm text-gray-600">{selectedPost.author.email}</p>
                    </div>
                  </div>
                  
                  {selectedPost.author.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone: {selectedPost.author.phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Post Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Post Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Submitted:</span>
                      <span>{selectedPost.submittedAt ? formatDate(selectedPost.submittedAt) : 'N/A'}</span>
                    </div>
                    
                    {selectedPost.readingTime && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Reading Time:</span>
                        <span>{selectedPost.readingTime} min</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Word Count:</span>
                      <span>{selectedPost.content.split(' ').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Review Actions */}
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Review Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPost.status === 'PENDING_APPROVAL' && (
                    <>
                      {/* Approval Options */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Publish Immediately</label>
                          <Switch
                            checked={publishImmediately}
                            onCheckedChange={setPublishImmediately}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Mark as Featured</label>
                          <Switch
                            checked={makeFeatured}
                            onCheckedChange={setMakeFeatured}
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Button
                          onClick={() => handleApprovalAction(selectedPost.slug, 'approve')}
                          disabled={processing}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          {processing ? 'Processing...' : 'Approve Post'}
                        </Button>
                        
                        <Button
                          variant="destructive"
                          onClick={() => {
                            const reason = prompt('Reason for rejection (optional):');
                            if (reason !== null) {
                              setRejectionReason(reason);
                              handleApprovalAction(selectedPost.slug, 'reject');
                            }
                          }}
                          disabled={processing}
                          className="w-full"
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Reject Post
                        </Button>
                      </div>
                    </>
                  )}

                  {selectedPost.status === 'APPROVED' && (
                    <div className="text-center py-4">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                      <p className="text-green-800 font-medium">Post Approved</p>
                      {selectedPost.approvedAt && (
                        <p className="text-sm text-gray-600 mt-1">
                          Approved on {formatDate(selectedPost.approvedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedPost.status === 'PUBLISHED' && (
                    <div className="text-center py-4">
                      <CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-blue-800 font-medium">Post Published</p>
                      {selectedPost.publishedAt && (
                        <p className="text-sm text-gray-600 mt-1">
                          Published on {formatDate(selectedPost.publishedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedPost.status === 'REJECTED' && (
                    <div className="text-center py-4">
                      <XCircle className="h-12 w-12 text-red-600 mx-auto mb-2" />
                      <p className="text-red-800 font-medium">Post Rejected</p>
                      {selectedPost.rejectedAt && (
                        <p className="text-sm text-gray-600 mt-1">
                          Rejected on {formatDate(selectedPost.rejectedAt)}
                        </p>
                      )}
                      {selectedPost.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            <strong>Reason:</strong> {selectedPost.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Main list view
  return (
    <DashboardLayout user={user}>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Blog Post Reviews</h1>
            <p className="text-gray-600 mt-1">Review and manage submitted blog posts</p>
          </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button
              onClick={() => router.push('/admin/blog')}
              variant="outline"
              size="sm"
            >
              <Edit className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Manage Published Posts</span>
              <span className="sm:hidden">Manage</span>
            </Button>
            <Button
              onClick={() => fetchPosts(currentPage, searchTerm, statusFilter)}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-900">{summary.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
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
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Approved</p>
                    <p className="text-2xl font-bold text-green-900">{summary.approved}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Rejected</p>
                    <p className="text-2xl font-bold text-red-900">{summary.rejected}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Published</p>
                    <p className="text-2xl font-bold text-blue-900">{summary.published}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
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
                  console.log('Status filter changed to:', value); // Debug log
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Posts List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {statusFilter === 'all' ? 'All Posts' : 
               statusFilter === 'PENDING_APPROVAL' ? 'Pending Approval' :
               statusFilter === 'APPROVED' ? 'Approved Posts' :
               statusFilter === 'PUBLISHED' ? 'Published Posts' :
               statusFilter === 'REJECTED' ? 'Rejected Posts' : 'Posts'}
            </CardTitle>
            <CardDescription>
              {pagination.totalPosts} {statusFilter === 'all' ? 'total' : statusFilter.toLowerCase().replace('_', ' ')} posts found
              {statusFilter !== 'all' && (
                <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                  Filter: {statusFilter}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                          <div className="flex space-x-2">
                            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
                <p className="text-gray-600">No blog posts match your current filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                          onClick={() => {
                            setSelectedPost(post);
                            setReviewMode(true);
                          }}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          {/* Featured Image */}
                          <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden">
                            {post.featuredImage ? (
                              <Image
                                src={post.featuredImage}
                                alt={post.title}
                                width={80}
                                height={80}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate group-hover:text-emerald-600 transition-colors">
                                  {post.title}
                                </h3>
                                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{post.excerpt}</p>
                                
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {getStatusBadge(post.status)}
                                  {getCategoryDisplay(post.category)}
                                </div>

                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                  <span className="flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    {post.author.name}
                                  </span>
                                  {post.submittedAt && (
                                    <span className="flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {formatDate(post.submittedAt)}
                                    </span>
                                  )}
                                  {post.readingTime && (
                                    <span className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {post.readingTime} min read
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPost(post);
                                    setReviewMode(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="hidden sm:inline ml-2">Review</span>
                                </Button>
                                
                                {post.status === 'PENDING_APPROVAL' && (
                                  <div className="flex space-x-1">
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApprovalAction(post.slug, 'approve');
                                      }}
                                      disabled={processing}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <ThumbsUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const reason = prompt('Reason for rejection (optional):');
                                        if (reason !== null) {
                                          setRejectionReason(reason);
                                          handleApprovalAction(post.slug, 'reject');
                                        }
                                      }}
                                      disabled={processing}
                                    >
                                      <ThumbsDown className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                  <p className="text-sm text-gray-700">
                    Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalPosts)} of {pagination.totalPosts} posts
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}