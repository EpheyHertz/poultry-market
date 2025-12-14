'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthorProfileForm from '@/components/author/author-profile-form';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PenTool, User } from 'lucide-react';

export default function EditProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/author/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
          <div className="h-4 w-80 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
        </div>
        
        {/* Form Card Skeleton */}
        <Card className="overflow-hidden border-0 shadow-xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)' }}>
          {/* Top accent bar */}
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.8), rgba(59, 130, 246, 0.8), rgba(249, 115, 22, 0.8))' }} />
          
          <CardContent className="p-6 space-y-6">
            {/* Avatar Upload Skeleton */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))' }} />
                <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.4)' }} />
              </div>
              <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
            </div>
            
            {/* Form Fields Skeleton */}
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                  <div className="h-10 w-full rounded-lg animate-pulse" style={{ background: `rgba(${i % 2 === 0 ? '16, 185, 129' : '59, 130, 246'}, 0.1)` }} />
                </div>
              ))}
            </div>
            
            {/* Bio Skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-16 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
              <div className="h-32 w-full rounded-lg animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.1)' }} />
            </div>
            
            {/* Social Links Skeleton */}
            <div className="space-y-3">
              <div className="h-5 w-28 rounded animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
              <div className="grid md:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'rgba(0,0,0,0.05)' }} />
                ))}
              </div>
            </div>
            
            {/* Submit Button Skeleton */}
            <div className="flex justify-end pt-4">
              <div className="h-11 w-32 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4))' }} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-6 rounded-2xl shadow-xl dark:bg-slate-900/80"
        style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(255,255,255,0.98) 100%)' }}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl shadow-md" style={{ background: profile ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)' }}>
            {profile ? (
              <User className="h-6 w-6" style={{ color: 'rgba(59, 130, 246, 0.9)' }} />
            ) : (
              <PenTool className="h-6 w-6" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              {profile ? 'Edit Author Profile' : 'Create Author Profile'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {profile 
                ? 'Update your author information and settings' 
                : 'Set up your author profile to start publishing'}
            </p>
          </div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <AuthorProfileForm 
          existingProfile={profile} 
          onSuccess={() => router.push('/author/dashboard')}
        />
      </motion.div>
    </div>
  );
}
