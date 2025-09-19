'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

interface LikeButtonProps {
  postId?: string;
  slug?: string;
  initialLiked?: boolean;
  initialCount?: number;
  onLikeChange?: (liked: boolean, count: number) => void;
}

export default function LikeButton({ 
  postId,
  slug, 
  initialLiked = false, 
  initialCount = 0,
  onLikeChange 
}: LikeButtonProps) {
  const [user, setUser] = useState<any>(null);
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialCount);
  const [loading, setLoading] = useState(false);

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

  // Fetch initial like status
  useEffect(() => {
    const fetchLikeStatus = async () => {
      if (!postId && !slug) return;
      
      try {
        const endpoint = slug ? `/api/blog/posts/${slug}/like` : `/api/blog/posts/${postId}/like`;
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setLiked(data.liked);
          setLikes(data.likes);
          onLikeChange?.(data.liked, data.likes);
        }
      } catch (error) {
        console.error('Error fetching like status:', error);
      }
    };

    fetchLikeStatus();
  }, [postId, slug, onLikeChange]);

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like posts');
      return;
    }

    if (!postId && !slug) {
      toast.error('Post identifier missing');
      return;
    }

    setLoading(true);
    try {
      const endpoint = slug ? `/api/blog/posts/${slug}/like` : `/api/blog/posts/${postId}/like`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        setLikes(data.likes);
        onLikeChange?.(data.liked, data.likes);
        
        if (data.liked) {
          toast.success('Post liked!');
        } else {
          toast.success('Like removed');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update like');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={liked ? 'default' : 'outline'}
      size="sm"
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center space-x-2 transition-all duration-200 ${
        liked 
          ? 'bg-red-500 hover:bg-red-600 text-white shadow-md border-red-500' 
          : 'hover:bg-red-50 hover:text-red-600 hover:border-red-300 border-gray-300'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Heart 
        className={`h-4 w-4 transition-all duration-200 ${
          liked ? 'fill-current text-white' : 'text-gray-500'
        } ${loading ? 'animate-pulse' : ''}`} 
      />
      <span className={`${liked ? 'text-white' : 'text-gray-700'} font-medium`}>
        {likes}
      </span>
    </Button>
  );
}