'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  BarChart2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  category: string;
  status: string;
  viewCount: number;
  readingTime?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  resubmitCount: number;
  _count: {
    likedBy: number;
    comments: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: FileText },
  PENDING_APPROVAL: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
  PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle },
  ARCHIVED: { label: 'Archived', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200', icon: FileText },
};

export default function AuthorPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletePost, setDeletePost] = useState<BlogPost | null>(null);
  const [resubmitting, setResubmitting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const postsPerPage = 12;
  const router = useRouter();

  const fetchPosts = async (page: number, status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: postsPerPage.toString(),
      });
      
      if (status !== 'all') {
        params.append('status', status);
      }
      
      const response = await fetch(`/api/blog/my-posts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      }
    } catch (error) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  // Reset to page 1 when status filter changes
  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deletePost) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/blog/posts/${deletePost.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPosts(posts.filter(p => p.id !== deletePost.id));
        toast.success('Post deleted successfully');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete post');
    } finally {
      setDeletePost(null);
      setDeleting(false);
    }
  };

  const handleResubmit = async (postId: string) => {
    setResubmitting(postId);
    try {
      const response = await fetch(`/api/blog/posts/by-id/${postId}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionNotes: 'Resubmitted with corrections' }),
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(posts.map(p => p.id === postId ? { ...p, status: 'PENDING_APPROVAL' as const, rejectionReason: undefined } : p));
        toast.success('Post resubmitted for review');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resubmit');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resubmit');
    } finally {
      setResubmitting(null);
    }
  };

  // Client-side search filter only (status is handled server-side)
  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-32 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
            <div className="h-4 w-48 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
          </div>
          <div className="h-10 w-36 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4))' }} />
        </div>
        
        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-10 rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.1)' }} />
          <div className="w-full sm:w-44 h-10 rounded-lg animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.1)' }} />
        </div>
        
        {/* Posts Skeleton */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-lg" style={{ background: 'rgba(255,255,255,0.9)' }}>
              <div className="h-0.5" style={{ background: `rgba(${i % 3 === 0 ? '16, 185, 129' : i % 3 === 1 ? '59, 130, 246' : '249, 115, 22'}, 0.5)` }} />
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Thumbnail Skeleton */}
                  <div className="hidden sm:block w-32 h-24 rounded-lg animate-pulse flex-shrink-0" style={{ background: `linear-gradient(135deg, rgba(${i % 2 === 0 ? '16, 185, 129' : '59, 130, 246'}, 0.2), rgba(249, 115, 22, 0.1))` }} />
                  
                  {/* Content Skeleton */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-2 flex-1">
                        <div className="h-5 w-3/4 rounded animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
                        <div className="h-4 w-full rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                        <div className="h-4 w-2/3 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.05)' }} />
                      </div>
                      <div className="h-8 w-8 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: `rgba(${i % 2 === 0 ? '16, 185, 129' : '249, 115, 22'}, 0.2)` }} />
                      <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.15)' }} />
                      <div className="h-6 w-24 rounded-full animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Pagination Skeleton */}
        <div className="flex justify-center gap-2 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-9 rounded-lg animate-pulse" style={{ background: `rgba(${i === 3 ? '16, 185, 129' : '0, 0, 0'}, ${i === 3 ? 0.3 : 0.1})` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl border-0 shadow-lg"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)'
        }}
      >
        <div className="absolute inset-0 rounded-2xl hidden dark:block" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)' }} />
        <div className="relative">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-orange-500 bg-clip-text text-transparent">My Posts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your blog posts <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'rgba(16, 185, 129, 0.9)' }}>{totalCount} total</span>
          </p>
        </div>
        <Button asChild className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))' }}>
          <Link href="/author/posts/new">
            <Plus className="h-4 w-4 mr-2" />
            Write New Post
          </Link>
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(59, 130, 246, 0.7)' }} />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-0 shadow-md transition-all duration-200 focus:shadow-lg dark:bg-slate-800/80"
            style={{ background: 'rgba(255,255,255,0.9)' }}
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px] border-0 shadow-md dark:bg-slate-800/80" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <Filter className="h-4 w-4 mr-2" style={{ color: 'rgba(249, 115, 22, 0.7)' }} />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Drafts</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending Review</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <Card className="border-0 shadow-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))' }}>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.5), rgba(59, 130, 246, 0.5), rgba(249, 115, 22, 0.5))' }} />
          <CardContent className="py-16 text-center">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))', filter: 'blur(8px)' }} />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))' }}>
                <FileText className="h-10 w-10" style={{ color: 'rgba(59, 130, 246, 0.6)' }} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No posts found' : 'No posts yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters to find what you\'re looking for'
                : 'Start your blogging journey by creating your first post'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button asChild className="shadow-lg hover:shadow-xl transition-all duration-300" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))' }}>
                <Link href="/author/posts/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Post
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post, index) => {
            const status = statusConfig[post.status] || statusConfig.DRAFT;
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.95)' }}>
                  <div className="h-1 transition-all duration-300" style={{ 
                    background: post.status === 'PUBLISHED' 
                      ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.8), rgba(16, 185, 129, 0.6))'
                      : post.status === 'PENDING_APPROVAL'
                      ? 'linear-gradient(90deg, rgba(234, 179, 8, 0.8), rgba(249, 115, 22, 0.6))'
                      : post.status === 'REJECTED'
                      ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 0.6))'
                      : 'linear-gradient(90deg, rgba(59, 130, 246, 0.5), rgba(139, 92, 246, 0.5))'
                  }} />
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      {post.featuredImage && (
                        <div className="hidden sm:block w-32 h-24 relative rounded-xl overflow-hidden flex-shrink-0 shadow-md group-hover:shadow-lg transition-all duration-300">
                          <Image
                            src={post.featuredImage}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <Link
                              href={
                                post.status === 'PUBLISHED'
                                  ? `/blog/${post.slug}`
                                  : `/author/posts/${post.id}/edit`
                              }
                              className="font-semibold hover:text-primary line-clamp-1"
                            >
                              {post.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className={`${status.color} text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {post.category.replace(/_/g, ' ')}
                              </Badge>
                              {post.resubmitCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Resubmitted {post.resubmitCount}x
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {post.status === 'PUBLISHED' && (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/blog/${post.slug}`}>
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View Post
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/author/posts/${post.id}/analytics`}>
                                      <BarChart2 className="h-4 w-4 mr-2" />
                                      Analytics
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {(post.status === 'DRAFT' || post.status === 'REJECTED') && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/author/posts/${post.id}/edit`}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {post.status === 'REJECTED' && (
                                <DropdownMenuItem
                                  onClick={() => handleResubmit(post.id)}
                                  disabled={resubmitting === post.id}
                                >
                                  <RefreshCw className={`h-4 w-4 mr-2 ${resubmitting === post.id ? 'animate-spin' : ''}`} />
                                  Resubmit
                                </DropdownMenuItem>
                              )}
                              {(post.status === 'DRAFT' || post.status === 'REJECTED') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeletePost(post)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Excerpt */}
                        {post.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                            {post.excerpt}
                          </p>
                        )}

                        {/* Rejection Reason */}
                        {post.status === 'REJECTED' && post.rejectionReason && (
                          <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
                            <strong>Rejection reason:</strong> {post.rejectionReason}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          {post.status === 'PUBLISHED' && (
                            <>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                {(post.viewCount || 0).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3.5 w-3.5" />
                                {post._count?.likedBy || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3.5 w-3.5" />
                                {post._count?.comments || 0}
                              </span>
                            </>
                          )}
                          {post.readingTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {post.readingTime} min read
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            {post.publishedAt
                              ? `Published ${formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}`
                              : `Updated ${formatDistanceToNow(new Date(post.updatedAt), { addSuffix: true })}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-4 mt-8 pt-6 border-t"
              style={{ borderColor: 'rgba(16, 185, 129, 0.1)' }}
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="border-0 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = page === 1 || 
                                    page === totalPages || 
                                    (page >= currentPage - 1 && page <= currentPage + 1);
                    const showEllipsis = (page === 2 && currentPage > 3) || 
                                        (page === totalPages - 1 && currentPage < totalPages - 2);
                    
                    if (showEllipsis && !showPage) {
                      return <span key={page} className="px-2 text-gray-400">...</span>;
                    }
                    
                    if (!showPage) return null;
                    
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        disabled={loading}
                        className={cn(
                          "border-0 shadow-md hover:shadow-lg transition-all duration-200 min-w-[36px]",
                          currentPage !== page && "bg-white/90 dark:bg-slate-800/90"
                        )}
                        style={currentPage === page ? { 
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))'
                        } : {}}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="border-0 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                >
                  Next
                </Button>
              </div>

              {/* Results info */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing <span className="font-medium" style={{ color: 'rgba(16, 185, 129, 0.9)' }}>{((currentPage - 1) * postsPerPage) + 1}-{Math.min(currentPage * postsPerPage, totalCount)}</span> of <span className="font-medium" style={{ color: 'rgba(59, 130, 246, 0.9)' }}>{totalCount}</span> posts
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePost} onOpenChange={() => !deleting && setDeletePost(null)}>
        <AlertDialogContent className="border-0 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))' }}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.8), rgba(249, 115, 22, 0.8))' }} />
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Post
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">&quot;{deletePost?.title}&quot;</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-0 shadow-md">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg transition-all duration-200"
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
