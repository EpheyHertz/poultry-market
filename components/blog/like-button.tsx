'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

interface LikeButtonProps {
  slug: string;
}

export default function LikeButton({ slug }: LikeButtonProps) {
  const [user, setUser] = useState<any>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
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
      try {
        const response = await fetch(`/api/blog/posts/${slug}/like`);
        if (response.ok) {
          const data = await response.json();
          setLiked(data.liked);
          setLikes(data.likes);
        }
      } catch (error) {
        console.error('Error fetching like status:', error);
      }
    };

    fetchLikeStatus();
  }, [slug]);

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like posts');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/blog/posts/${slug}/like`, {
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
      className={`flex items-center space-x-2 ${
        liked 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
      }`}
    >
      <Heart 
        className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} 
      />
      <span>{likes}</span>
    </Button>
  );
}