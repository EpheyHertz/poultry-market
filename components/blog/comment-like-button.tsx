'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

interface CommentLikeButtonProps {
  commentId: string;
  userAuthenticated: boolean;
}

export default function CommentLikeButton({ commentId, userAuthenticated }: CommentLikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch initial like status
  useEffect(() => {
    const fetchLikeStatus = async () => {
      try {
        const response = await fetch(`/api/blog/comments/${commentId}/like`);
        if (response.ok) {
          const data = await response.json();
          setLiked(data.liked);
          setLikes(data.likes);
        }
      } catch (error) {
        console.error('Error fetching comment like status:', error);
      }
    };

    fetchLikeStatus();
  }, [commentId]);

  const handleLike = async () => {
    if (!userAuthenticated) {
      toast.error('Please log in to like comments');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/blog/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        setLikes(data.likes);
        
        if (data.liked) {
          toast.success('Comment liked!');
        } else {
          toast.success('Like removed');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update like');
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      toast.error('Failed to update like');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center space-x-1 ${
        liked 
          ? 'text-red-600 hover:text-red-700' 
          : 'text-gray-500 hover:text-red-600'
      }`}
    >
      <Heart 
        className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} 
      />
      <span>{likes > 0 ? likes : ''}</span>
    </Button>
  );
}