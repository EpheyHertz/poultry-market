'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PublicNavbar from '@/components/layout/public-navbar';
import FollowButton from '@/components/blog/follow-button';
import { ThemeToggle } from '@/components/theme';
import {
  User,
  Calendar,
  MapPin,
  Globe,
  Briefcase,
  Building,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Github,
  Youtube,
  Link as LinkIcon,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  CheckCircle,
  FileText,
  Users,
  ArrowLeft,
  Share2,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Award,
  Settings,
  LayoutDashboard,
  PenTool
} from 'lucide-react';
import { format } from 'date-fns';
import MarkdownExcerpt from '@/components/blog/markdown-excerpt';
import { toast } from 'sonner';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  category: string;
  readingTime?: number;
  viewCount: number;
  publishedAt: string;
  authorId: string;
  authorName: string;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  _count: {
    likedBy: number;
    comments: number;
  };
}

interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  github?: string;
  youtube?: string;
}

interface AuthorProfile {
  id: string;
  displayName: string;
  username: string;
  bio?: string;
  tagline?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  website?: string;
  location?: string;
  occupation?: string;
  company?: string;
  expertise?: string[];
  socialLinks?: SocialLinks;
  isVerified: boolean;
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    createdAt: string;
    _count: {
      followers: number;
      following: number;
    };
  };
  blogPosts: BlogPost[];
}

interface PublicAuthorProfileProps {
  profile: AuthorProfile;
}

const categoryColors: Record<string, string> = {
  FARMING_TIPS: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  POULTRY_HEALTH: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  FEED_NUTRITION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  EQUIPMENT_GUIDES: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  MARKET_TRENDS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  SUCCESS_STORIES: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  INDUSTRY_NEWS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  SEASONAL_ADVICE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
  BEGINNER_GUIDES: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300',
  ADVANCED_TECHNIQUES: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
};

export default function PublicAuthorProfile({ profile }: PublicAuthorProfileProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => setCurrentUser(data))
      .catch(() => null);
  }, []);

  // Check if the logged-in user is the owner of this profile
  const isOwner = currentUser && currentUser.id === profile.user.id;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.displayName} - Author Profile`,
          url,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied to clipboard!');
    }
  };

  const socialLinks = profile.socialLinks || {};
  const hasSocialLinks = Object.values(socialLinks).some(Boolean);

  // Generate the correct blog post URL using authorName and slug
  const getBlogPostUrl = (post: BlogPost) => {
    const authorName = post.authorName.toLowerCase().replace(/\s+/g, '-');
    return `/blog/${authorName}/${post.slug}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PublicNavbar />
      
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <Button 
            variant="ghost" 
            asChild 
            className="border-0 shadow-md hover:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
            style={{ background: 'rgba(255,255,255,0.9)' }}
          >
            <Link href="/blog" className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
              <ArrowLeft className="h-4 w-4" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
              Back to Blog
            </Link>
          </Button>
        </motion.div>

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8 overflow-hidden border-0 shadow-2xl dark:bg-slate-900/80">
            {/* Cover Image / Banner */}
            <div className="relative h-32 sm:h-48" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8))' }}>
              {profile.coverImageUrl && (
                <Image
                  src={profile.coverImageUrl}
                  alt="Cover"
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-20 h-20 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent)' }} />
              <div className="absolute bottom-4 left-1/3 w-16 h-16 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)' }} />
            </div>
          
          <CardContent className="relative px-4 sm:px-6 pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-4 sm:left-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4))', filter: 'blur(12px)', width: '136px', height: '136px', marginLeft: '-4px', marginTop: '-4px' }} />
                <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-white dark:border-slate-900 shadow-2xl relative">
                  <AvatarImage src={profile.avatarUrl || profile.user.avatar} alt={profile.displayName} />
                  <AvatarFallback className="text-4xl font-bold" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))', color: 'rgba(16, 185, 129, 0.9)' }}>
                    {profile.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {profile.isVerified && (
                  <div className="absolute -bottom-1 -right-1 rounded-full p-1.5 border-2 border-white dark:border-slate-900 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))' }}>
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-4 pb-8 sm:pb-4 gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShare} 
                className="border-0 shadow-md hover:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                style={{ background: 'rgba(255,255,255,0.9)' }}
              >
                <Share2 className="h-4 w-4 mr-2" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                Share
              </Button>
              
              {/* Owner-specific actions */}
              {isOwner ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild 
                    className="border-0 shadow-md hover:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                    style={{ background: 'rgba(255,255,255,0.9)' }}
                  >
                    <Link href="/author/dashboard">
                      <LayoutDashboard className="h-4 w-4 mr-2" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                      Dashboard
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild 
                    className="border-0 shadow-md hover:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                    style={{ background: 'rgba(255,255,255,0.9)' }}
                  >
                    <Link href="/author/profile/edit">
                      <Settings className="h-4 w-4 mr-2" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
                      Edit Profile
                    </Link>
                  </Button>
                  <Button 
                    size="sm" 
                    asChild 
                    className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))' }}
                  >
                    <Link href="/author/posts/new">
                      <PenTool className="h-4 w-4 mr-2" />
                      New Post
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  {/* Link to detailed blog author page */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild 
                    className="border-0 shadow-md hover:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                    style={{ background: 'rgba(255,255,255,0.9)' }}
                  >
                    <Link href={`/blog/author/${profile.user.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                      View Full Profile
                    </Link>
                  </Button>
                  {currentUser && (
                    <FollowButton userId={profile.user.id} />
                  )}
                </>
              )}
            </div>

            {/* Profile Info */}
            <div className="mt-4 sm:mt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">{profile.displayName}</h1>
                {isOwner && (
                  <Badge className="gap-1 border-0 shadow-md" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'rgba(59, 130, 246, 0.9)' }}>
                    <User className="h-3 w-3" />
                    Your Profile
                  </Badge>
                )}
                {profile.isVerified && (
                  <Badge className="gap-1 border-0 shadow-md" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'rgba(16, 185, 129, 0.9)' }}>
                    <CheckCircle className="h-3 w-3" />
                    Verified Author
                  </Badge>
                )}
              </div>
              <p className="text-gray-500 dark:text-slate-400">@{profile.username}</p>

              {profile.tagline && (
                <p className="mt-2 text-lg font-medium flex items-center gap-2" style={{ color: 'rgba(16, 185, 129, 0.9)' }}>
                  <Sparkles className="h-4 w-4" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
                  {profile.tagline}
                </p>
              )}

              {profile.bio && (
                <p className="mt-4 text-gray-600 dark:text-slate-300 max-w-2xl leading-relaxed">{profile.bio}</p>
              )}

              {/* Expertise Tags */}
              {profile.expertise && profile.expertise.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {profile.expertise.map((skill, index) => {
                    const colors = [
                      { bg: 'rgba(16, 185, 129, 0.1)', color: 'rgba(16, 185, 129, 0.9)' },
                      { bg: 'rgba(59, 130, 246, 0.1)', color: 'rgba(59, 130, 246, 0.9)' },
                      { bg: 'rgba(249, 115, 22, 0.1)', color: 'rgba(249, 115, 22, 0.9)' },
                      { bg: 'rgba(139, 92, 246, 0.1)', color: 'rgba(139, 92, 246, 0.9)' },
                    ];
                    const colorIndex = index % colors.length;
                    return (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="border-0 shadow-sm"
                        style={{ background: colors[colorIndex].bg, color: colors[colorIndex].color }}
                      >
                        {skill}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-slate-400">
                {profile.occupation && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                    <Briefcase className="h-4 w-4" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                    {profile.occupation}
                  </span>
                )}
                {profile.company && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
                    <Building className="h-4 w-4" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                    {profile.company}
                  </span>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
                    <MapPin className="h-4 w-4" style={{ color: 'rgba(239, 68, 68, 0.8)' }} />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:shadow-md transition-all duration-200"
                    style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'rgba(16, 185, 129, 0.9)' }}
                  >
                    <Globe className="h-4 w-4" />
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.08)' }}>
                  <Calendar className="h-4 w-4" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                  Joined {format(new Date(profile.user.createdAt), 'MMMM yyyy')}
                </span>
              </div>

              {/* Social Links */}
              {hasSocialLinks && (
                <div className="flex gap-2 mt-4">
                  {socialLinks.twitter && (
                    <a
                      href={socialLinks.twitter.startsWith('http') ? socialLinks.twitter : `https://twitter.com/${socialLinks.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110"
                      style={{ background: 'rgba(29, 161, 242, 0.1)' }}
                    >
                      <Twitter className="h-5 w-5" style={{ color: 'rgba(29, 161, 242, 0.9)' }} />
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a
                      href={socialLinks.linkedin.startsWith('http') ? socialLinks.linkedin : `https://linkedin.com/in/${socialLinks.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110"
                      style={{ background: 'rgba(0, 119, 181, 0.1)' }}
                    >
                      <Linkedin className="h-5 w-5" style={{ color: 'rgba(0, 119, 181, 0.9)' }} />
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a
                      href={socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110"
                      style={{ background: 'rgba(24, 119, 242, 0.1)' }}
                    >
                      <Facebook className="h-5 w-5" style={{ color: 'rgba(24, 119, 242, 0.9)' }} />
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram.startsWith('http') ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110"
                      style={{ background: 'rgba(225, 48, 108, 0.1)' }}
                    >
                      <Instagram className="h-5 w-5" style={{ color: 'rgba(225, 48, 108, 0.9)' }} />
                    </a>
                  )}
                  {socialLinks.github && (
                    <a
                      href={socialLinks.github.startsWith('http') ? socialLinks.github : `https://github.com/${socialLinks.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110"
                      style={{ background: 'rgba(36, 41, 46, 0.1)' }}
                    >
                      <Github className="h-5 w-5" style={{ color: 'rgba(36, 41, 46, 0.9)' }} />
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a
                      href={socialLinks.youtube.startsWith('http') ? socialLinks.youtube : `https://youtube.com/@${socialLinks.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110"
                      style={{ background: 'rgba(255, 0, 0, 0.1)' }}
                    >
                      <Youtube className="h-5 w-5" style={{ color: 'rgba(255, 0, 0, 0.9)' }} />
                    </a>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <div className="text-center p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <FileText className="h-4 w-4" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                    <p className="text-2xl font-bold" style={{ color: 'rgba(16, 185, 129, 0.9)' }}>{profile.blogPosts.length}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Posts</p>
                </div>
                <div className="text-center p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Users className="h-4 w-4" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                    <p className="text-2xl font-bold" style={{ color: 'rgba(59, 130, 246, 0.9)' }}>{profile.user._count.followers}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Followers</p>
                </div>
                <div className="text-center p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200" style={{ background: 'rgba(139, 92, 246, 0.08)' }}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Eye className="h-4 w-4" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                    <p className="text-2xl font-bold" style={{ color: 'rgba(139, 92, 246, 0.9)' }}>
                      {profile.totalViews >= 1000 
                        ? `${(profile.totalViews / 1000).toFixed(1)}k` 
                        : profile.totalViews}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Total Views</p>
                </div>
                <div className="text-center p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200" style={{ background: 'rgba(249, 115, 22, 0.08)' }}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Heart className="h-4 w-4" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
                    <p className="text-2xl font-bold" style={{ color: 'rgba(249, 115, 22, 0.9)' }}>{profile.totalLikes}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Total Likes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Posts Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <FileText className="h-5 w-5" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
            </div>
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Published Posts ({profile.blogPosts.length})
            </span>
          </h2>

          {profile.blogPosts.length === 0 ? (
            <Card className="border-0 shadow-xl dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.98)' }}>
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 p-4 rounded-full w-fit" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                  <FileText className="h-12 w-12" style={{ color: 'rgba(16, 185, 129, 0.4)' }} />
                </div>
                <p className="text-gray-500 dark:text-slate-400">No published posts yet</p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-2">Check back later for new content!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {profile.blogPosts.map((post, index) => {
                const cardColors = [
                  'rgba(16, 185, 129, 0.6)',
                  'rgba(59, 130, 246, 0.6)',
                  'rgba(249, 115, 22, 0.6)',
                  'rgba(139, 92, 246, 0.6)',
                ];
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ y: -4 }}
                  >
                    <Link href={getBlogPostUrl(post)}>
                      <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.98)' }}>
                        <div className="h-1" style={{ background: cardColors[index % cardColors.length] }} />
                        {post.featuredImage && (
                          <div className="relative h-48 overflow-hidden">
                            <Image
                              src={post.featuredImage}
                              alt={post.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        )}
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs border-0 shadow-sm ${categoryColors[post.category] || ''}`}
                            >
                              {post.category.replace(/_/g, ' ')}
                            </Badge>
                            {post.readingTime && (
                              <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'rgba(139, 92, 246, 0.9)' }}>
                                <Clock className="h-3 w-3" />
                                {post.readingTime} min read
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {post.title}
                          </h3>

                          {post.excerpt && (
                            <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2 mb-4">
                              {post.excerpt}
                            </p>
                          )}

                          {/* Tags */}
                          {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {post.tags.slice(0, 3).map(({ tag }) => (
                                <span key={tag.id} className="text-xs" style={{ color: 'rgba(16, 185, 129, 0.8)' }}>
                                  #{tag.name}
                                </span>
                              ))}
                              {post.tags.length > 3 && (
                                <span className="text-xs text-gray-400 dark:text-slate-500">
                                  +{post.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm pt-3 border-t" style={{ borderColor: 'rgba(16, 185, 129, 0.1)' }}>
                            <span className="text-gray-500 dark:text-slate-400">{format(new Date(post.publishedAt), 'MMM d, yyyy')}</span>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                <Eye className="h-3.5 w-3.5" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                                <span style={{ color: 'rgba(59, 130, 246, 0.9)' }}>{post.viewCount}</span>
                              </span>
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
                                <Heart className="h-3.5 w-3.5" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
                                <span style={{ color: 'rgba(249, 115, 22, 0.9)' }}>{post._count.likedBy}</span>
                              </span>
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                                <MessageCircle className="h-3.5 w-3.5" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                                <span style={{ color: 'rgba(139, 92, 246, 0.9)' }}>{post._count.comments}</span>
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* CTA to view more */}
        {profile.blogPosts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center"
          >
            <Button 
              asChild 
              variant="outline" 
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))' }}
            >
              <Link href={`/blog/author/${profile.user.id}`} className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent font-medium">
                  View Full Author Profile & Analytics
                </span>
              </Link>
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
