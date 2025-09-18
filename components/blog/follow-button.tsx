'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface FollowButtonProps {
  authorId: string;
}

export default function FollowButton({ authorId }: FollowButtonProps) {
  const [user, setUser] = useState<any>(null);
  const [following, setFollowing] = useState(false);
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

  // Fetch initial follow status
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/follow/${authorId}`);
        if (response.ok) {
          const data = await response.json();
          setFollowing(data.following);
        }
      } catch (error) {
        console.error('Error fetching follow status:', error);
      }
    };

    fetchFollowStatus();
  }, [authorId, user]);

  // Don't show follow button for own posts
  if (user?.id === authorId) {
    return null;
  }

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please log in to follow authors');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/follow/${authorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFollowing(data.following);
        
        if (data.following) {
          toast.success('Now following this author!');
        } else {
          toast.success('Unfollowed author');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update follow status');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={following ? 'default' : 'outline'}
      size="sm"
      onClick={handleFollow}
      disabled={loading}
      className={`flex items-center space-x-2 ${
        following 
          ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
          : 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300'
      }`}
    >
      {following ? (
        <>
          <UserCheck className="h-4 w-4" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          <span>Follow</span>
        </>
      )}
    </Button>
  );
}