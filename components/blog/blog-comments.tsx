'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import BlogImageUpload from '@/components/blog/blog-image-upload';
import CommentLikeButton from '@/components/blog/comment-like-button';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  MessageCircle,
  Send,
  Reply,
  Edit3,
  Trash2,
  MoreHorizontal,
  User,
  Calendar,
  ImageIcon,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
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

interface Comment {
  id: string;
  content: string;
  images: string[];
  isApproved: boolean;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  guestName?: string;
  guestEmail?: string;
  replies?: Comment[];
}

interface BlogCommentsProps {
  postId: string;
  comments?: Comment[];
  onCommentsUpdate?: () => void;
}

export default function BlogComments({ postId, comments: initialComments, onCommentsUpdate }: BlogCommentsProps) {
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [isLoadingComments, setIsLoadingComments] = useState(!initialComments);
  const [newComment, setNewComment] = useState('');
  const [newCommentImages, setNewCommentImages] = useState<{url: string; name: string; size: number}[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState<{url: string; name: string; size: number}[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  // Fetch comments if not provided as props
  const fetchComments = useCallback(async () => {
    try {
      setIsLoadingComments(true);
      const response = await fetch(`/api/blog/comments?postId=${postId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setIsLoadingComments(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!initialComments) {
      fetchComments();
    }
  }, [postId, initialComments, fetchComments]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmitComment = async (parentId?: string) => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!user && (!guestName.trim() || !guestEmail.trim())) {
      toast.error('Please enter your name and email');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          content: newComment,
          images: newCommentImages.map(img => img.url),
          parentId,
          guestName: !user ? guestName : undefined,
          guestEmail: !user ? guestEmail : undefined,
        }),
      });

      if (response.ok) {
        toast.success('Comment submitted successfully!');
        setNewComment('');
        setNewCommentImages([]);
        setGuestName('');
        setGuestEmail('');
        setReplyingTo(null);
        // Refresh comments
        fetchComments();
        onCommentsUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to submit comment');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) {
      toast.error('Please enter comment content');
      return;
    }

    try {
      const response = await fetch(`/api/blog/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent,
          images: editImages.map(img => img.url),
        }),
      });

      if (response.ok) {
        toast.success('Comment updated successfully!');
        setEditingComment(null);
        setEditContent('');
        setEditImages([]);
        fetchComments();
        onCommentsUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update comment');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/blog/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Comment deleted successfully!');
        fetchComments();
        onCommentsUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
    setEditImages(comment.images.map((url, index) => ({
      url,
      name: `Image ${index + 1}`,
      size: 0
    })));
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
    setEditImages([]);
  };

  const canModifyComment = (comment: Comment) => {
    if (!user) return false;
    return user.id === comment.author?.id || user.role === 'ADMIN';
  };

  const CommentCard = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <Card className={`${isReply ? 'ml-8 border-l-4 border-l-emerald-200' : ''} mb-4`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.author?.avatar} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">
                  {comment.author?.name || comment.guestName}
                </span>
                {comment.isEdited && (
                  <Badge variant="outline" className="text-xs">
                    Edited
                  </Badge>
                )}
                {!comment.isApproved && (
                  <Badge variant="secondary" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pending approval
                  </Badge>
                )}
              </div>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{formatDate(comment.createdAt)}</span>
                {comment.isEdited && comment.editedAt && (
                  <span className="ml-2">• Edited {formatDate(comment.editedAt)}</span>
                )}
              </div>
            </div>
          </div>

          {canModifyComment(comment) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startEdit(comment)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    setCommentToDelete(comment.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {editingComment === comment.id ? (
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Edit your comment..."
              rows={3}
            />
            
            <BlogImageUpload
              images={editImages}
              onImagesChange={setEditImages}
              maxImages={2}
              maxFileSize={5 * 1024 * 1024} // 5MB for comments
            />

            <div className="flex space-x-2">
              <Button onClick={() => handleEditComment(comment.id)} size="sm">
                <Check className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={cancelEdit} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-gray-700 mb-3 whitespace-pre-wrap">
              {comment.content}
            </div>

            {comment.images && comment.images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {comment.images.map((image, index) => (
                  <div key={index} className="relative">
                    <Image
                      src={image}
                      alt={`Comment image ${index + 1}`}
                      width={200}
                      height={150}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <CommentLikeButton 
                commentId={comment.id} 
                userAuthenticated={!!user} 
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              >
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <MessageCircle className="h-6 w-6 text-emerald-600" />
        <h3 className="text-xl font-bold text-gray-900">
          Comments ({comments.length})
        </h3>
      </div>

      {isLoadingComments ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <>
          {/* New Comment Form */}
          <Card>
        <CardHeader>
          <h4 className="font-semibold">Leave a Comment</h4>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          )}

          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? 'Share your thoughts...' : 'Share your thoughts... (Your comment will be reviewed before appearing)'}
            rows={4}
          />

          <BlogImageUpload
            images={newCommentImages}
            onImagesChange={setNewCommentImages}
            maxImages={2}
            maxFileSize={5 * 1024 * 1024} // 5MB for comments
          />

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {!user && 'Your comment will be reviewed before appearing.'}
            </span>
            <Button
              onClick={() => handleSubmitComment()}
              disabled={isSubmitting}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Post Comment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id}>
            <CommentCard comment={comment} />
            
            {/* Reply Form */}
            {replyingTo === comment.id && (
              <Card className="ml-8 mb-4 bg-gray-50">
                <CardContent className="p-4 space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Reply to this comment..."
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleSubmitComment(comment.id)}
                      disabled={isSubmitting}
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                    <Button
                      onClick={() => setReplyingTo(null)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="space-y-2">
                {comment.replies.map((reply) => (
                  <CommentCard key={reply.id} comment={reply} isReply />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {comments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </CardContent>
        </Card>
      )}
      </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => commentToDelete && handleDeleteComment(commentToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}