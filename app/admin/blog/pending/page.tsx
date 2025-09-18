'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Eye,
  Check,
  X,
  Clock,
  User,
  Calendar,
  Mail,
  Phone,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Edit
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Image from 'next/image';

interface PendingBlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  images: string[];
  category: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  approvedAt?: string;
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

  // Fetch pending posts
  const fetchPosts = async (page = 1, search = '', status = 'PENDING_APPROVAL') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status,
        ...(search && { search }),
      });

      const response = await fetch(`/api/blog/pending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch posts');

      const data = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load pending posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPosts(currentPage, searchTerm, statusFilter);
    }
  }, [currentPage, searchTerm, statusFilter, user]);

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
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setReviewMode(false);
                  setSelectedPost(null);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Review Blog Post</h1>
                <p className="text-gray-600">Review and approve or reject this submission</p>
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{selectedPost.title}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(selectedPost.submittedAt!)}
                        </span>
                        <span className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          {selectedPost.readingTime} min read
                        </span>
                        <Badge className={BLOG_CATEGORIES[selectedPost.category as keyof typeof BLOG_CATEGORIES]?.color}>
                          {BLOG_CATEGORIES[selectedPost.category as keyof typeof BLOG_CATEGORIES]?.icon} {BLOG_CATEGORIES[selectedPost.category as keyof typeof BLOG_CATEGORIES]?.name}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Excerpt */}
                  {selectedPost.excerpt && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Excerpt</h4>
                      <p className="text-gray-600">{selectedPost.excerpt}</p>
                    </div>
                  )}

                  {/* Featured Image */}
                  {selectedPost.featuredImage && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Featured Image</h4>
                      <Image
                        src={selectedPost.featuredImage}
                        alt={selectedPost.title}
                        width={600}
                        height={300}
                        className="rounded-lg object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Content</h4>
                    <div className="prose max-w-none p-4 border rounded-lg bg-white">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedPost.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Additional Images */}
                  {selectedPost.images.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Additional Images</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedPost.images.map((url, index) => (
                          <Image
                            key={index}
                            src={url}
                            alt={`Additional image ${index + 1}`}
                            width={200}
                            height={150}
                            className="rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedPost.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedPost.tags.map((tag) => (
                          <Badge key={tag.id} variant="outline">
                            {tag.name}
                          </Badge>
                        ))}
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
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Author Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{selectedPost.author.name}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {selectedPost.author.email}
                    </div>
                    {selectedPost.author.phone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedPost.author.phone}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Submission Notes */}
              {selectedPost.submissionNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Submission Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{selectedPost.submissionNotes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {selectedPost.status === 'PENDING_APPROVAL' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Review Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Approval Options */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="publish-immediately" className="text-sm">
                          Publish immediately
                        </Label>
                        <Switch
                          id="publish-immediately"
                          checked={publishImmediately}
                          onCheckedChange={setPublishImmediately}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="make-featured" className="text-sm">
                          Make featured post
                        </Label>
                        <Switch
                          id="make-featured"
                          checked={makeFeatured}
                          onCheckedChange={setMakeFeatured}
                        />
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    <div>
                      <Label htmlFor="rejection-reason" className="text-sm">
                        Rejection reason (if rejecting)
                      </Label>
                      <Textarea
                        id="rejection-reason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this post is being rejected..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={() => handleApprovalAction(selectedPost.slug, 'approve')}
                        disabled={processing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {processing ? 'Processing...' : (publishImmediately ? 'Approve & Publish' : 'Approve')}
                      </Button>
                      
                      <Button
                        onClick={() => handleApprovalAction(selectedPost.slug, 'reject')}
                        disabled={processing}
                        variant="destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {processing ? 'Processing...' : 'Reject'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status History */}
              {(selectedPost.status === 'APPROVED' || selectedPost.status === 'REJECTED') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Review Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedPost.approvedAt && (
                      <div className="flex items-center text-sm text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approved on {formatDate(selectedPost.approvedAt)}
                      </div>
                    )}
                    
                    {selectedPost.rejectedAt && (
                      <div className="flex items-center text-sm text-red-600">
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejected on {formatDate(selectedPost.rejectedAt)}
                      </div>
                    )}
                    
                    {selectedPost.rejectionReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-xs font-medium text-red-800 mb-1">Rejection Reason:</div>
                        <div className="text-sm text-red-700">{selectedPost.rejectionReason}</div>
                      </div>
                    )}
                    
                    {selectedPost.approvedByUser && (
                      <div className="text-xs text-gray-500">
                        Reviewed by {selectedPost.approvedByUser.name}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Main list view
  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blog Post Reviews</h1>
            <p className="text-gray-600 mt-1">Review and manage submitted blog posts</p>
          </div>
          
          <Button
            onClick={() => router.push('/admin/blog')}
            variant="outline"
          >
            <Edit className="h-4 w-4 mr-2" />
            Manage Published Posts
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{summary.pending}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{summary.approved}</div>
                  <div className="text-sm text-gray-600">Approved</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{summary.rejected}</div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{summary.published}</div>
                  <div className="text-sm text-gray-600">Published</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search posts, authors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Posts List */}
        <Card>
          <CardHeader>
            <CardTitle>Submitted Posts</CardTitle>
            <CardDescription>
              {pagination.totalPosts} total posts found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No posts found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          {/* Featured Image Thumbnail */}
                          {post.featuredImage && (
                            <Image
                              src={post.featuredImage}
                              alt={post.title}
                              width={80}
                              height={60}
                              className="rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-gray-900 truncate">{post.title}</h3>
                              {getStatusBadge(post.status)}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                              <span className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {post.author.name}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {formatDate(post.submittedAt!)}
                              </span>
                              <Badge className={BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color}>
                                {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name}
                              </Badge>
                            </div>
                            
                            {post.excerpt && (
                              <p className="text-gray-600 text-sm line-clamp-2">{post.excerpt}</p>
                            )}
                            
                            {post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {post.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag.id} variant="outline" className="text-xs">
                                    {tag.name}
                                  </Badge>
                                ))}
                                {post.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{post.tags.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPost(post);
                            setReviewMode(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                        
                        {post.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprovalAction(post.slug, 'approve')}
                              disabled={processing}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApprovalAction(post.slug, 'reject')}
                              disabled={processing}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalPosts)} of {pagination.totalPosts} posts
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(pagination.currentPage - 1)}
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
                    onClick={() => setCurrentPage(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}