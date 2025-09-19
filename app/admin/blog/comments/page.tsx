'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search,
  Calendar,
  MessageSquare,
  User,
  Mail,
  Image as ImageIcon,
  Filter,
  RefreshCw,
  Clock,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Activity,
  TrendingUp,
  Users,
  Heart,
  Reply
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';

interface BlogComment {
  id: string;
  content: string;
  images: string[];
  isApproved: boolean;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: string;
  moderatedAt: string | null;
  moderationReason: string | null;
  guestName: string | null;
  guestEmail: string | null;
  author: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  post: {
    id: string;
    title: string;
    slug: string;
    author: {
      id: string;
      name: string;
    };
  };
  parentId: string | null;
  _count: {
    replies: number;
  };
}

interface CommentModerationFilters {
  status: 'all' | 'pending' | 'approved' | 'rejected';
  search: string;
  postId: string;
}

export default function CommentModerationPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CommentModerationFilters>({
    status: 'pending',
    search: '',
    postId: ''
  });
  const [selectedComment, setSelectedComment] = useState<BlogComment | null>(null);
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [posts, setPosts] = useState<Array<{ id: string; title: string }>>([]);

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

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') {
        params.set('status', filters.status);
      }
      if (filters.search) {
        params.set('search', filters.search);
      }
      if (filters.postId) {
        params.set('postId', filters.postId);
      }
      params.set('includeUnapproved', 'true');

      const response = await fetch(`/api/admin/blog/comments?${params}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      
      const data = await response.json();
      setComments(data.comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/admin/blog/posts?limit=100&status=all');
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      setPosts(data.posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  useEffect(() => {
    fetchComments();
    fetchPosts();
  }, [fetchComments]);

  const handleModeration = async (commentId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`/api/blog/comments/${commentId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action, 
          reason: action === 'reject' ? reason : undefined 
        }),
      });

      if (!response.ok) throw new Error('Failed to moderate comment');

      const data = await response.json();
      
      toast({
        title: 'Success',
        description: data.message,
      });

      // Refresh comments
      fetchComments();
      
      // Reset states
      setSelectedComment(null);
      setModerationAction(null);
      setRejectionReason('');
      
    } catch (error) {
      console.error('Error moderating comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to moderate comment',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (comment: BlogComment) => {
    if (comment.moderationReason) {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (comment.isApproved) {
      return <Badge variant="default">Approved</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const filteredComments = comments.filter(comment => {
    if (filters.status === 'pending' && (comment.isApproved || comment.moderationReason)) return false;
    if (filters.status === 'approved' && !comment.isApproved) return false;
    if (filters.status === 'rejected' && !comment.moderationReason) return false;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        comment.content.toLowerCase().includes(searchLower) ||
        comment.author?.name.toLowerCase().includes(searchLower) ||
        comment.guestName?.toLowerCase().includes(searchLower) ||
        comment.post.title.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Show loading state while fetching user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-gray-600 font-medium">Loading comments...</p>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const pendingCount = filteredComments.filter(c => !c.isApproved && !c.moderationReason).length;
  const approvedCount = filteredComments.filter(c => c.isApproved).length;
  const rejectedCount = filteredComments.filter(c => c.moderationReason).length;

  return (
    <DashboardLayout user={user}>
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  Comment Moderation
                </h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  Manage and moderate blog comments across all posts
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={fetchComments}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-white/50 hover:bg-white/80"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-500 rounded-lg">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-yellow-600 font-medium text-sm">Pending</p>
                      <p className="text-yellow-900 font-bold text-lg">{pendingCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-green-600 font-medium text-sm">Approved</p>
                      <p className="text-green-900 font-bold text-lg">{approvedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-500 rounded-lg">
                      <XCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-red-600 font-medium text-sm">Rejected</p>
                      <p className="text-red-900 font-bold text-lg">{rejectedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "spring", stiffness: 300 }}>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium text-sm">Total</p>
                      <p className="text-blue-900 font-bold text-lg">{filteredComments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="mb-6 bg-white/70 backdrop-blur-sm border-gray-200 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
                <CardDescription>Filter comments by status, post, or search content</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-gray-700">Status</label>
                    <Select
                      value={filters.status}
                      onValueChange={(value: any) => setFilters(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="bg-white/50 border-gray-200 hover:bg-white/80 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Comments</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block text-gray-700">Post</label>
                    <Select
                      value={filters.postId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, postId: value }))}
                    >
                      <SelectTrigger className="bg-white/50 border-gray-200 hover:bg-white/80 transition-colors">
                        <SelectValue placeholder="All posts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All posts</SelectItem>
                        {posts.map((post) => (
                          <SelectItem key={post.id} value={post.id}>
                            {post.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-2 block text-gray-700">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search comments, authors, or posts..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-10 bg-white/50 border-gray-200 hover:bg-white/80 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Comments List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-4"
          >
            {filteredComments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/70 backdrop-blur-sm border-gray-200 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      >
                        <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      </motion.div>
                      <motion.h3 
                        className="text-xl font-semibold text-gray-900 mb-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        No comments found
                      </motion.h3>
                      <motion.p 
                        className="text-gray-500 max-w-md mx-auto"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        {filters.status === 'pending' 
                          ? 'No comments are pending moderation. Great job staying on top of things!' 
                          : 'Try adjusting your filters to see more comments.'
                        }
                      </motion.p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <AnimatePresence>
                {filteredComments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <Card className="overflow-hidden bg-white/70 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="pt-6">
                        <div className="flex flex-col space-y-4">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <div className="flex items-center space-x-3">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 300 }}
                              >
                                {comment.author ? (
                                  <Avatar className="h-10 w-10 ring-2 ring-gray-200 ring-offset-2">
                                    <AvatarImage src={comment.author.image || ''} alt={comment.author.name} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold">
                                      {comment.author.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <div className="h-10 w-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center ring-2 ring-gray-200 ring-offset-2">
                                    <User className="h-5 w-5 text-white" />
                                  </div>
                                )}
                              </motion.div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {comment.author?.name || comment.guestName}
                                  {comment.guestEmail && (
                                    <span className="text-gray-500 ml-2 text-sm font-normal">
                                      ({comment.guestEmail})
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {formatDistanceToNow(new Date(comment.createdAt))} ago
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(comment)}
                            </div>
                          </div>

                          {/* Post info */}
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border">
                            <p className="text-sm text-gray-600">Comment on:</p>
                            <Link 
                              href={`/blog/${comment.post.author.name.replace(/\s+/g, '-').toLowerCase()}/${comment.post.slug}`}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline transition-colors"
                            >
                              {comment.post.title}
                            </Link>
                          </div>

                          {/* Content */}
                          <div className="prose prose-sm max-w-none">
                            <p className="text-gray-900 leading-relaxed">{comment.content}</p>
                          </div>

                          {/* Images */}
                          {comment.images && comment.images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {comment.images.map((image, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
                                  <Image
                                    src={image}
                                    alt={`Comment image ${idx + 1}`}
                                    fill
                                    className="object-cover hover:scale-105 transition-transform duration-200"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Moderation Actions */}
                          {!comment.isApproved && !comment.moderationReason && (
                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  onClick={() => {
                                    setSelectedComment(comment);
                                    setModerationAction('approve');
                                  }}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 w-full sm:w-auto"
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                  Approve
                                </Button>
                              </motion.div>
                              
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  onClick={() => {
                                    setSelectedComment(comment);
                                    setModerationAction('reject');
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2 w-full sm:w-auto"
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                  Reject
                                </Button>
                              </motion.div>
                            </div>
                          )}

                          {/* Moderation Info */}
                          {(comment.isApproved || comment.moderationReason) && (
                            <div className="pt-4 border-t">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">
                                  {comment.isApproved ? 'Approved' : 'Rejected'}
                                </span>
                                {comment.moderatedAt && (
                                  <span className="ml-2">
                                    {formatDistanceToNow(new Date(comment.moderatedAt))} ago
                                  </span>
                                )}
                                {comment.moderationReason && (
                                  <span className="block mt-1 text-red-600">
                                    Reason: {comment.moderationReason}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}

                          {/* Reply Count */}
                          {comment._count.replies > 0 && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Reply className="h-3 w-3" />
                              {comment._count.replies} {comment._count.replies === 1 ? 'reply' : 'replies'}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>

          {/* Approval Confirmation Dialog */}
          <AlertDialog 
            open={moderationAction === 'approve' && selectedComment !== null} 
            onOpenChange={() => {
              setModerationAction(null);
              setSelectedComment(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve Comment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to approve this comment? It will be visible to all users.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => selectedComment && handleModeration(selectedComment.id, 'approve')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve Comment
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Rejection Dialog */}
          <AlertDialog 
            open={moderationAction === 'reject' && selectedComment !== null} 
            onOpenChange={() => {
              setModerationAction(null);
              setSelectedComment(null);
              setRejectionReason('');
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject Comment</AlertDialogTitle>
                <AlertDialogDescription>
                  Please provide a reason for rejecting this comment (optional).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Textarea
                  placeholder="Reason for rejection (optional)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => selectedComment && handleModeration(selectedComment.id, 'reject', rejectionReason)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Reject Comment
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </motion.div>
    </DashboardLayout>
  );
}