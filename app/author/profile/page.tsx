'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Edit,
  Globe,
  MapPin,
  Briefcase,
  Building,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  CheckCircle,
  Calendar,
  FileText,
  Eye,
  Heart,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
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
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))' }} />
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.15)' }} />
            <div className="h-10 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.15)' }} />
          </div>
        </div>
        
        {/* Profile Card Skeleton */}
        <Card className="overflow-hidden border-0 shadow-xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)' }}>
          <div className="h-2" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.8), rgba(59, 130, 246, 0.8), rgba(249, 115, 22, 0.8))' }} />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar Skeleton */}
              <div className="relative mx-auto md:mx-0">
                <div className="h-24 w-24 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.5)' }} />
              </div>
              
              {/* Info Skeleton */}
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div className="space-y-2">
                  <div className="h-8 w-48 rounded-lg animate-pulse mx-auto md:mx-0" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
                  <div className="h-4 w-32 rounded-lg animate-pulse mx-auto md:mx-0" style={{ background: 'rgba(0,0,0,0.1)' }} />
                </div>
                <div className="h-16 w-full rounded-lg animate-pulse" style={{ background: 'rgba(0,0,0,0.05)' }} />
                
                {/* Stats Skeleton */}
                <div className="flex justify-center md:justify-start gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="text-center space-y-1">
                      <div className="h-7 w-12 rounded-lg animate-pulse mx-auto" style={{ background: `rgba(${i === 1 ? '16, 185, 129' : i === 2 ? '59, 130, 246' : '249, 115, 22'}, 0.2)` }} />
                      <div className="h-3 w-10 rounded animate-pulse mx-auto" style={{ background: 'rgba(0,0,0,0.1)' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Additional Cards Skeleton */}
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden border-0 shadow-lg" style={{ background: 'rgba(255,255,255,0.8)' }}>
            <div className="h-1" style={{ background: `rgba(${i === 1 ? '16, 185, 129' : i === 2 ? '59, 130, 246' : '249, 115, 22'}, 0.5)` }} />
            <CardContent className="p-6 space-y-4">
              <div className="h-6 w-40 rounded-lg animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2].map((j) => (
                  <div key={j} className="h-16 rounded-lg animate-pulse" style={{ background: 'rgba(0,0,0,0.05)' }} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-0 shadow-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))' }}>
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgba(59, 130, 246, 0.7), rgba(249, 115, 22, 0.7))' }} />
          <CardContent className="p-10 text-center">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))', filter: 'blur(10px)' }} />
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))' }}>
                <User className="h-12 w-12" style={{ color: 'rgba(59, 130, 246, 0.7)' }} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Author Profile Yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Create your author profile to start sharing your expertise with the community.
            </p>
            <Button asChild className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))' }}>
              <Link href="/author/profile/edit">
                <Edit className="h-4 w-4 mr-2" />
                Create Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const socialLinks = profile.socialLinks || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-orange-500 bg-clip-text text-transparent">Author Profile</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="border-0 shadow-md hover:shadow-lg transition-all duration-200 dark:bg-slate-800/80" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <Link href={`/author/${profile.username}`} target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
              View Public
            </Link>
          </Button>
          <Button asChild className="shadow-lg hover:shadow-xl transition-all duration-300" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))' }}>
            <Link href="/author/profile/edit">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))' }}>
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.8), rgba(59, 130, 246, 0.8), rgba(249, 115, 22, 0.8))' }} />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative mx-auto md:mx-0">
                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))', filter: 'blur(4px)' }} />
                <Avatar className="h-24 w-24 relative border-3 shadow-xl" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                  <AvatarFallback className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))' }}>
                    {profile.displayName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {profile.isVerified && (
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(16, 185, 129, 0.8))' }}>
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.displayName}</h2>
                  {profile.isVerified && (
                    <Badge className="gap-1 w-fit mx-auto md:mx-0 border-0 shadow-md" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'rgba(16, 185, 129, 0.9)' }}>
                      <CheckCircle className="h-3 w-3" />
                      Verified Author
                    </Badge>
                  )}
                </div>
                <p className="mb-4" style={{ color: 'rgba(59, 130, 246, 0.8)' }}>@{profile.username}</p>
                
                {profile.bio && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{profile.bio}</p>
                )}

                {/* Stats */}
                <div className="flex justify-center md:justify-start gap-6 text-sm">
                  <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'rgba(16, 185, 129, 0.9)' }}>{profile.totalPosts || 0}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Posts</p>
                  </div>
                  <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'rgba(59, 130, 246, 0.9)' }}>{(profile.totalViews || 0).toLocaleString()}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Views</p>
                  </div>
                  <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(249, 115, 22, 0.08)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'rgba(249, 115, 22, 0.9)' }}>{profile.totalLikes || 0}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Likes</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Professional Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <div className="h-1" style={{ background: 'rgba(59, 130, 246, 0.5)' }} />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
              Professional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {profile.occupation && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                    <Briefcase className="h-5 w-5" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Occupation</p>
                    <p className="font-medium text-gray-900 dark:text-white">{profile.occupation}</p>
                  </div>
                </div>
              )}
              {profile.company && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                    <Building className="h-5 w-5" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
                    <p className="font-medium text-gray-900 dark:text-white">{profile.company}</p>
                  </div>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(249, 115, 22, 0.05)' }}>
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
                    <MapPin className="h-5 w-5" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                    <p className="font-medium text-gray-900 dark:text-white">{profile.location}</p>
                  </div>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                    <Globe className="h-5 w-5" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Website</p>
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium hover:underline transition-colors"
                      style={{ color: 'rgba(139, 92, 246, 0.9)' }}
                    >
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {!profile.occupation && !profile.company && !profile.location && !profile.website && (
              <div className="text-center py-6 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                <p className="text-gray-500 dark:text-gray-400">
                  No professional information added yet.
                  <Link href="/author/profile/edit" className="ml-1 font-medium hover:underline" style={{ color: 'rgba(16, 185, 129, 0.9)' }}>
                    Add some?
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Social Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <div className="h-1" style={{ background: 'rgba(249, 115, 22, 0.5)' }} />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
              Social Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter.startsWith('http') ? socialLinks.twitter : `https://twitter.com/${socialLinks.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  style={{ background: 'rgba(29, 161, 242, 0.1)', color: 'rgba(29, 161, 242, 0.9)' }}
                >
                  <Twitter className="h-4 w-4" />
                  Twitter
                </a>
              )}
              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin.startsWith('http') ? socialLinks.linkedin : `https://linkedin.com/in/${socialLinks.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  style={{ background: 'rgba(10, 102, 194, 0.1)', color: 'rgba(10, 102, 194, 0.9)' }}
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  style={{ background: 'rgba(24, 119, 242, 0.1)', color: 'rgba(24, 119, 242, 0.9)' }}
                >
                  <Facebook className="h-4 w-4" />
                  Facebook
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram.startsWith('http') ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  style={{ background: 'rgba(228, 64, 95, 0.1)', color: 'rgba(228, 64, 95, 0.9)' }}
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              )}
              
              {!socialLinks.twitter && !socialLinks.linkedin && !socialLinks.facebook && !socialLinks.instagram && (
                <div className="w-full text-center py-6 rounded-xl" style={{ background: 'rgba(249, 115, 22, 0.05)' }}>
                  <p className="text-gray-500 dark:text-gray-400">
                    No social links added yet.
                    <Link href="/author/profile/edit" className="ml-1 font-medium hover:underline" style={{ color: 'rgba(16, 185, 129, 0.9)' }}>
                      Add some?
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <div className="h-1" style={{ background: 'rgba(139, 92, 246, 0.5)' }} />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between items-center p-4 rounded-xl" style={{ background: profile.isPublic ? 'rgba(16, 185, 129, 0.05)' : 'rgba(156, 163, 175, 0.1)' }}>
                <span className="text-gray-700 dark:text-gray-300">Public Profile</span>
                <Badge className="border-0 shadow-sm" style={{ background: profile.isPublic ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.2)', color: profile.isPublic ? 'rgba(16, 185, 129, 0.9)' : 'rgba(156, 163, 175, 0.9)' }}>
                  {profile.isPublic ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl" style={{ background: profile.allowComments ? 'rgba(59, 130, 246, 0.05)' : 'rgba(156, 163, 175, 0.1)' }}>
                <span className="text-gray-700 dark:text-gray-300">Comments</span>
                <Badge className="border-0 shadow-sm" style={{ background: profile.allowComments ? 'rgba(59, 130, 246, 0.15)' : 'rgba(156, 163, 175, 0.2)', color: profile.allowComments ? 'rgba(59, 130, 246, 0.9)' : 'rgba(156, 163, 175, 0.9)' }}>
                  {profile.allowComments ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl" style={{ background: profile.emailOnComment ? 'rgba(249, 115, 22, 0.05)' : 'rgba(156, 163, 175, 0.1)' }}>
                <span className="text-gray-700 dark:text-gray-300">Email on Comments</span>
                <Badge className="border-0 shadow-sm" style={{ background: profile.emailOnComment ? 'rgba(249, 115, 22, 0.15)' : 'rgba(156, 163, 175, 0.2)', color: profile.emailOnComment ? 'rgba(249, 115, 22, 0.9)' : 'rgba(156, 163, 175, 0.9)' }}>
                  {profile.emailOnComment ? 'On' : 'Off'}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl" style={{ background: profile.emailOnFollow ? 'rgba(139, 92, 246, 0.05)' : 'rgba(156, 163, 175, 0.1)' }}>
                <span className="text-gray-700 dark:text-gray-300">Email on Follow</span>
                <Badge className="border-0 shadow-sm" style={{ background: profile.emailOnFollow ? 'rgba(139, 92, 246, 0.15)' : 'rgba(156, 163, 175, 0.2)', color: profile.emailOnFollow ? 'rgba(139, 92, 246, 0.9)' : 'rgba(156, 163, 175, 0.9)' }}>
                  {profile.emailOnFollow ? 'On' : 'Off'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Meta Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <div className="h-0.5" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3), rgba(249, 115, 22, 0.3))' }} />
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                Profile created {format(new Date(profile.createdAt), 'MMMM d, yyyy')}
              </span>
              <span>
                Last updated {format(new Date(profile.updatedAt), 'MMMM d, yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
