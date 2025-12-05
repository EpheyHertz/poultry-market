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
    <Card className={`${isReply ? 'ml-3 sm:ml-8 border-l-2 sm:border-l-4 border-l-emerald-200 dark:border-l-emerald-600' : ''} mb-3 sm:mb-4 border-slate-200 dark:border-slate-800 overflow-hidden max-w-full`}>
      <CardHeader className="pb-2 sm:pb-3 px-2 sm:px-6">
        <div className="flex items-start justify-between gap-1 sm:gap-2">
          <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0 flex-1">
            <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
              <AvatarImage src={comment.author?.avatar} />
              <AvatarFallback>
                <User className="h-3 w-3 sm:h-4 sm:w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center flex-wrap gap-0.5 sm:gap-2">
                <span className="font-medium text-[11px] sm:text-sm truncate max-w-[100px] sm:max-w-none dark:text-slate-100">
                  {comment.author?.name || comment.guestName}
                </span>
                {comment.isEdited && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs px-1 py-0">
                    Edited
                  </Badge>
                )}
                {!comment.isApproved && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 py-0">
                    <AlertCircle className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
              <div className="flex items-center text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{formatDate(comment.createdAt)}</span>
              </div>
            </div>
          </div>

          {canModifyComment(comment) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-8 sm:w-8 p-0 flex-shrink-0">
                  <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px]">
                <DropdownMenuItem onClick={() => startEdit(comment)} className="text-xs sm:text-sm">
                  <Edit3 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    setCommentToDelete(comment.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-red-600 text-xs sm:text-sm"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-2 sm:px-6 overflow-hidden">
        {editingComment === comment.id ? (
          <div className="space-y-3 sm:space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Edit your comment..."
              rows={3}
              className="text-xs sm:text-sm min-h-[60px] sm:min-h-[70px] dark:bg-slate-800 dark:border-slate-700"
            />
            
            <BlogImageUpload
              images={editImages}
              onImagesChange={setEditImages}
              maxImages={2}
              maxFileSize={5 * 1024 * 1024} // 5MB for comments
            />

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleEditComment(comment.id)} size="sm" className="text-xs sm:text-sm">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Save
              </Button>
              <Button onClick={cancelEdit} variant="outline" size="sm" className="text-xs sm:text-sm">
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-gray-700 dark:text-slate-300 mb-2 sm:mb-3 whitespace-pre-wrap break-words overflow-wrap-anywhere text-xs sm:text-sm leading-relaxed max-w-full overflow-hidden">
              {comment.content}
            </div>

            {comment.images && comment.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
                {comment.images.map((image, index) => (
                  <div key={index} className="relative">
                    <Image
                      src={image}
                      alt={`Comment image ${index + 1}`}
                      width={200}
                      height={150}
                      className="w-full h-20 sm:h-24 object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1">
              <CommentLikeButton 
                commentId={comment.id} 
                userAuthenticated={!!user} 
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="h-6 sm:h-8 px-1.5 sm:px-3 text-[10px] sm:text-sm"
              >
                <Reply className="h-3 w-3 mr-0.5 sm:mr-2" />
                Reply
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center space-x-2">
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">
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
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 sm:pb-4">
              <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-slate-100">Leave a Comment</h4>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
              {!user && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              )}

              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={user ? 'Share your thoughts...' : 'Share your thoughts... (Your comment will be reviewed before appearing)'}
                rows={3}
                className="text-sm sm:text-base min-h-[80px] sm:min-h-[100px] dark:bg-slate-800 dark:border-slate-700"
              />

              <BlogImageUpload
                images={newCommentImages}
                onImagesChange={setNewCommentImages}
                maxImages={2}
                maxFileSize={5 * 1024 * 1024} // 5MB for comments
              />

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 order-2 sm:order-1">
                  {!user && 'Your comment will be reviewed before appearing.'}
                </span>
                <Button
                  onClick={() => handleSubmitComment()}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto order-1 sm:order-2"
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Post Comment'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comments List */}
          <div className="space-y-3 sm:space-y-4">
            {comments.map((comment) => (
              <div key={comment.id}>
                <CommentCard comment={comment} />
                
                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <Card className="ml-3 sm:ml-8 mb-3 sm:mb-4 bg-gray-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
                    <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Reply to this comment..."
                        rows={2}
                        className="text-xs sm:text-sm min-h-[50px] sm:min-h-[60px] dark:bg-slate-800 dark:border-slate-700"
                      />
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Button
                          onClick={() => handleSubmitComment(comment.id)}
                          disabled={isSubmitting}
                          size="sm"
                          className="text-[10px] sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                        <Button
                          onClick={() => setReplyingTo(null)}
                          variant="outline"
                          size="sm"
                          className="text-[10px] sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
                    {comment.replies.map((reply) => (
                      <CommentCard key={reply.id} comment={reply} isReply />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {comments.length === 0 && (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-6 sm:p-8 text-center text-gray-500 dark:text-slate-400">
                <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-400 dark:text-slate-500" />
                <p className="text-sm sm:text-base">No comments yet. Be the first to share your thoughts!</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Delete Comment</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => commentToDelete && handleDeleteComment(commentToDelete)}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}