'use client';

import { useState, useEffect, useMemo } from 'react';
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
  PenTool,
  ChevronLeft,
  ChevronRight,
  Gift
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
  authorUsername?: string | null;
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
  supportEnabled?: boolean;
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
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => setCurrentUser(data))
      .catch(() => null);
  }, []);

  // Check if the logged-in user is the owner of this profile
  const isOwner = currentUser && currentUser.id === profile.user.id;

  // Pagination logic
  const totalPosts = profile.blogPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const paginatedPosts = useMemo(() => {
    return profile.blogPosts.slice(startIndex, startIndex + postsPerPage);
  }, [profile.blogPosts, startIndex, postsPerPage]);

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

  // Generate the correct blog post URL using username (preferred) or authorName fallback
  const getBlogPostUrl = (post: BlogPost) => {
    // Use profile username first (since all posts on this page belong to this author)
    // Then fallback to post's authorUsername, then authorName
    const authorPath = profile.username || post.authorUsername || post.authorName.toLowerCase().replace(/\s+/g, '-');
    return `/blog/${authorPath}/${post.slug}`;
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
            className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white/90 dark:bg-slate-800/80"
          >
            <Link href="/blog" className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
              <ArrowLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
          <Card className="mb-8 overflow-hidden border-0 shadow-2xl bg-white dark:bg-slate-900/80">
            {/* Cover Image / Banner */}
            <div className="relative h-32 sm:h-48 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 dark:from-emerald-600 dark:via-blue-600 dark:to-purple-600">
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
              <div className="absolute top-4 right-4 w-20 h-20 rounded-full opacity-30 bg-white/40 blur-sm" />
              <div className="absolute bottom-4 left-1/3 w-16 h-16 rounded-full opacity-20 bg-white/30 blur-sm" />
            </div>
          
          <CardContent className="relative px-4 sm:px-6 pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-4 sm:left-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full animate-pulse bg-gradient-to-br from-emerald-400/40 to-blue-400/40 blur-xl w-36 h-36 -ml-1 -mt-1" />
                <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-white dark:border-slate-900 shadow-2xl relative">
                  <AvatarImage src={profile.avatarUrl || profile.user.avatar} alt={profile.displayName} />
                  <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-emerald-900/50 dark:to-blue-900/50 text-emerald-600 dark:text-emerald-400">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {profile.isVerified && (
                  <div className="absolute -bottom-1 -right-1 rounded-full p-1.5 border-2 border-white dark:border-slate-900 shadow-lg bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600">
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
                className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white/90 dark:bg-slate-800/80"
              >
                <Share2 className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                Share
              </Button>
              
              {/* Owner-specific actions */}
              {isOwner ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild 
                    className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white/90 dark:bg-slate-800/80"
                  >
                    <Link href="/author/dashboard">
                      <LayoutDashboard className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild 
                    className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white/90 dark:bg-slate-800/80"
                  >
                    <Link href="/author/profile/edit">
                      <Settings className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />
                      Edit Profile
                    </Link>
                  </Button>
                  <Button 
                    size="sm" 
                    asChild 
                    className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white"
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
                    className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white/90 dark:bg-slate-800/80"
                  >
                    <Link href={`/blog/author/${profile.user.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      View Full Profile
                    </Link>
                  </Button>
                  {currentUser && (
                    <FollowButton userId={profile.user.id} />
                  )}
                  {/* Support Button - Only shows if author has wallet set up */}
                  {profile.supportEnabled && (
                    <Button 
                      size="sm" 
                      asChild 
                      className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-pink-500 to-rose-500 dark:from-pink-600 dark:to-rose-600 text-white"
                    >
                      <Link href={`/support/${profile.id}`}>
                        <Gift className="h-4 w-4 mr-2" />
                        Support Author
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Profile Info */}
            <div className="mt-4 sm:mt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">{profile.displayName}</h1>
                {isOwner && (
                  <Badge className="gap-1 border-0 shadow-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    <User className="h-3 w-3" />
                    Your Profile
                  </Badge>
                )}
                {profile.isVerified && (
                  <Badge className="gap-1 border-0 shadow-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="h-3 w-3" />
                    Verified Author
                  </Badge>
                )}
              </div>
              <p className="text-gray-500 dark:text-slate-400">@{profile.username}</p>

              {profile.tagline && (
                <p className="mt-2 text-lg font-medium flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-4 w-4 text-orange-500 dark:text-orange-400" />
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
                    const colorClasses = [
                      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
                      'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
                      'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
                      'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
                    ];
                    const colorIndex = index % colorClasses.length;
                    return (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className={`border-0 shadow-sm ${colorClasses[colorIndex]}`}
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
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                    <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {profile.occupation}
                  </span>
                )}
                {profile.company && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20">
                    <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {profile.company}
                  </span>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20">
                    <MapPin className="h-4 w-4 text-red-500 dark:text-red-400" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:shadow-md transition-all duration-200 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                  >
                    <Globe className="h-4 w-4" />
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20">
                  <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 bg-sky-100 dark:bg-sky-900/30"
                    >
                      <Twitter className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a
                      href={socialLinks.linkedin.startsWith('http') ? socialLinks.linkedin : `https://linkedin.com/in/${socialLinks.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 bg-blue-100 dark:bg-blue-900/30"
                    >
                      <Linkedin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a
                      href={socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 bg-blue-100 dark:bg-blue-900/30"
                    >
                      <Facebook className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram.startsWith('http') ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 bg-pink-100 dark:bg-pink-900/30"
                    >
                      <Instagram className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    </a>
                  )}
                  {socialLinks.github && (
                    <a
                      href={socialLinks.github.startsWith('http') ? socialLinks.github : `https://github.com/${socialLinks.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 bg-gray-100 dark:bg-gray-800"
                    >
                      <Github className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a
                      href={socialLinks.youtube.startsWith('http') ? socialLinks.youtube : `https://youtube.com/@${socialLinks.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 bg-red-100 dark:bg-red-900/30"
                    >
                      <Youtube className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </a>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-emerald-200/50 dark:border-slate-700">
                <div className="text-center p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{profile.blogPosts.length}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Posts</p>
                </div>
                <div className="text-center p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{profile.user._count.followers}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Followers</p>
                </div>
                <div className="text-center p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 bg-purple-50 dark:bg-purple-900/20">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {profile.totalViews >= 1000 
                        ? `${(profile.totalViews / 1000).toFixed(1)}k` 
                        : profile.totalViews}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Total Views</p>
                </div>
                <div className="text-center p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 bg-orange-50 dark:bg-orange-900/20">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Heart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{profile.totalLikes}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Total Likes</p>
                </div>
              </div>
              
              {/* Support Card - Only shows for non-owners if author has wallet set up */}
              {!isOwner && profile.supportEnabled && (
                <div className="mt-6 pt-6 border-t border-pink-200/50 dark:border-pink-900/30">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border border-pink-200/50 dark:border-pink-800/30">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <div className="p-2.5 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
                        <Gift className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Support {profile.displayName}&apos;s Work</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Show appreciation for great content</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      asChild 
                      className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-6"
                    >
                      <Link href={`/support/${profile.id}`}>
                        <Heart className="h-4 w-4 mr-2" />
                        Send Support
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
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
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Published Posts ({profile.blogPosts.length})
            </span>
          </h2>

          {profile.blogPosts.length === 0 ? (
            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900/80">
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 p-4 rounded-full w-fit bg-emerald-100 dark:bg-emerald-900/30">
                  <FileText className="h-12 w-12 text-emerald-400 dark:text-emerald-500" />
                </div>
                <p className="text-gray-500 dark:text-slate-400">No published posts yet</p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-2">Check back later for new content!</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {paginatedPosts.map((post, index) => {
                  const cardColors = [
                    { light: 'rgba(16, 185, 129, 0.6)', dark: 'rgba(16, 185, 129, 0.8)' },
                    { light: 'rgba(59, 130, 246, 0.6)', dark: 'rgba(59, 130, 246, 0.8)' },
                    { light: 'rgba(249, 115, 22, 0.6)', dark: 'rgba(249, 115, 22, 0.8)' },
                    { light: 'rgba(139, 92, 246, 0.6)', dark: 'rgba(139, 92, 246, 0.8)' },
                  ];
                  const colorIndex = index % cardColors.length;
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ y: -4 }}
                    >
                      <Link href={getBlogPostUrl(post)}>
                        <Card className="h-full overflow-hidden border border-gray-100 dark:border-slate-700/50 shadow-lg hover:shadow-2xl transition-all duration-300 group bg-white dark:bg-slate-800/90">
                          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 dark:from-emerald-400 dark:via-blue-400 dark:to-purple-400" />
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
                                className={`text-xs border-0 shadow-sm ${categoryColors[post.category] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'}`}
                              >
                                {post.category.replace(/_/g, ' ')}
                              </Badge>
                              {post.readingTime && (
                                <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
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
                                  <span key={tag.id} className="text-xs text-emerald-600 dark:text-emerald-400">
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

                            <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100 dark:border-slate-700">
                              <span className="text-gray-500 dark:text-slate-400">{format(new Date(post.publishedAt), 'MMM d, yyyy')}</span>
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">{post.viewCount}</span>
                                </span>
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                  <Heart className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">{post._count.likedBy}</span>
                                </span>
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">{post._count.comments}</span>
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage = page === 1 || 
                          page === totalPages || 
                          Math.abs(page - currentPage) <= 1;
                        
                        const showEllipsis = page === 2 && currentPage > 3 ||
                          page === totalPages - 1 && currentPage < totalPages - 2;
                        
                        if (showEllipsis && !showPage) {
                          return <span key={page} className="px-2 text-gray-400 dark:text-slate-500">...</span>;
                        }
                        
                        if (!showPage) return null;
                        
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page 
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                              : "dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Results info */}
                  <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-4">
                    Showing {startIndex + 1}-{Math.min(startIndex + postsPerPage, totalPosts)} of {totalPosts} posts
                  </p>
                </motion.div>
              )}
            </>
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
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20"
            >
              <Link href={`/blog/author/${profile.user.id}`} className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
