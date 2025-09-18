'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Filter
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Comment Moderation</h1>
        <p className="text-gray-600">Manage and moderate blog comments</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">Post</label>
              <Select
                value={filters.postId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, postId: value }))}
              >
                <SelectTrigger>
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
            
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search comments, authors, or posts..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {filteredComments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No comments found</h3>
                <p className="text-gray-500">
                  {filters.status === 'pending' 
                    ? 'No comments are pending moderation.' 
                    : 'Try adjusting your filters to see more comments.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredComments.map((comment) => (
            <Card key={comment.id} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {comment.author ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.author.image || ''} alt={comment.author.name} />
                          <AvatarFallback>
                            {comment.author.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {comment.author?.name || comment.guestName}
                          {comment.guestEmail && (
                            <span className="text-gray-500 ml-2 text-sm">
                              ({comment.guestEmail})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(comment.createdAt))} ago
                          {comment.isEdited && comment.editedAt && (
                            <span className="ml-2">(edited {formatDistanceToNow(new Date(comment.editedAt))} ago)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(comment)}
                    </div>
                  </div>

                  {/* Post Info */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Comment on: </span>
                      <Link 
                        href={`/blog/${comment.post.slug}`}
                        className="ml-1 text-blue-600 hover:underline font-medium"
                      >
                        {comment.post.title}
                      </Link>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{comment.content}</p>
                  </div>

                  {/* Images */}
                  {comment.images && comment.images.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <ImageIcon className="h-4 w-4 mr-1" />
                        <span>{comment.images.length} image(s)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {comment.images.map((image, index) => (
                          <div key={index} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                            <Image
                              src={image}
                              alt={`Comment image ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Moderation Actions */}
                  {!comment.isApproved && !comment.moderationReason && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedComment(comment);
                            setModerationAction('approve');
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedComment(comment);
                            setModerationAction('reject');
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/blog/${comment.post.slug}#comment-${comment.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View in Post
                        </Link>
                      </Button>
                    </div>
                  )}

                  {/* Moderation Info */}
                  {(comment.isApproved || comment.moderationReason) && (
                    <div className="pt-4 border-t text-sm text-gray-600">
                      {comment.moderatedAt && (
                        <p>
                          Moderated {formatDistanceToNow(new Date(comment.moderatedAt))} ago
                          {comment.moderationReason && (
                            <span className="block mt-1 text-red-600">
                              Reason: {comment.moderationReason}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reply Count */}
                  {comment._count.replies > 0 && (
                    <div className="text-sm text-gray-500">
                      {comment._count.replies} {comment._count.replies === 1 ? 'reply' : 'replies'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
    </DashboardLayout>
  );
}