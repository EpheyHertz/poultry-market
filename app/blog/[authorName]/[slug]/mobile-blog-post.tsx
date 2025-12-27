'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  MessageCircle,
  Share2,
  User,
  Bookmark,
  Facebook,
  Twitter,
  Linkedin,
  ChevronRight,
  Tag,
  Users,
  Copy,
  ArrowUp,
  ArrowDown,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import BlogComments from '@/components/blog/blog-comments';
import LikeButton from '@/components/blog/like-button';
import FollowButton from '@/components/blog/follow-button';
import SupportButton from '@/components/blog/SupportButton';
import { BlogPost, BLOG_CATEGORIES } from '@/types/blog';
import MarkdownExcerpt from '@/components/blog/markdown-excerpt';
import ChunkedMarkdownContent from '@/components/blog/chunked-markdown-content';
import ReadingProgress from '@/components/blog/reading-progress';
import TableOfContents from '@/components/blog/table-of-contents';
import AuthorCard from '@/components/blog/author-card';
import { ThemeToggle } from '@/components/theme';

// Extended interfaces to support AuthorProfile data
interface ExtendedAuthor {
  id: string;
  name: string;
  displayName?: string | null;
  username?: string | null;
  email?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  role?: string;
  bio?: string | null;
  tagline?: string | null;
  website?: string | null;
  location?: string | null;
  socialLinks?: any;
  isVerified?: boolean;
  _count?: {
    blogPosts?: number;
    followers?: number;
    following?: number;
  };
}

interface ExtendedBlogPost extends Omit<BlogPost, 'author'> {
  author: ExtendedAuthor;
  authorProfileId?: string | null;
  authorUsername?: string | null;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  authorBio?: string | null;
  authorIsVerified?: boolean;
}

interface BlogPostPageProps {
  post: ExtendedBlogPost;
  relatedPosts?: ExtendedBlogPost[];
}

function MobileBlogPost({ post, relatedPosts = [] }: BlogPostPageProps) {
  const router = useRouter();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  
  // Get author display info from AuthorProfile data
  const authorDisplayName = post.authorDisplayName || post.author.displayName || post.author.name;
  const authorUsername = post.authorUsername || post.author.username;
  const authorAvatar = post.authorAvatarUrl || post.author.avatarUrl || post.author.avatar;
  const authorBio = post.authorBio || post.author.bio;
  const authorIsVerified = post.authorIsVerified || post.author.isVerified;
  
  // Build author profile URL - prefer username-based URL
  const authorProfileUrl = authorUsername 
    ? `/author/${authorUsername}` 
    : `/blog/author/${post.author.id}`;

  // Track scroll position for back to top/bottom button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show button after scrolling 400px
      setShowScrollButton(scrollTop > 400);
      
      // Check if near bottom (within 600px of bottom)
      setIsNearBottom(scrollTop + windowHeight >= documentHeight - 600);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  const isOwnPost = currentUser?.id === post.author.id;

  useEffect(() => {
    // Fetch current user
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showShareMenu) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showShareMenu]);

  const getCategoryDisplay = (category: string) => {
    const categoryInfo = BLOG_CATEGORIES[category as keyof typeof BLOG_CATEGORIES];
    if (!categoryInfo) return <Badge variant="outline">{category}</Badge>;

    return (
      <Badge className={`${categoryInfo.color} inline-flex items-center`}>
        <span className="mr-1">{categoryInfo.icon}</span>
        {categoryInfo.name}
      </Badge>
    );
  };

  const sharePost = async (platform: string) => {
    const shareUrl = window.location.href;
    const shareData = {
      title: post.title,
      text: post.excerpt || 'Check out this blog post',
      url: shareUrl,
    };

    switch (platform) {
      case 'native':
        if (navigator.share) {
          try {
            await navigator.share(shareData);
            toast.success('Post shared successfully!');
          } catch (error) {
            console.log('Share cancelled');
          }
        }
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&t=${encodeURIComponent(post.title)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
        break;
    }
    setShowShareMenu(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 transition-colors duration-300 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Reading Progress Bar */}
      <ReadingProgress 
        readingTime={post.readingTime ?? undefined} 
        postId={post.id} 
      />

      {/* Mobile Navigation Header */}
  <div className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl transition-all duration-300 dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Mobile Back Button & Breadcrumb */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="h-9 w-9 sm:h-10 sm:w-10 p-0 flex-shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl transition-colors"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-slate-300" />
              </Button>

              {/* Mobile Breadcrumb - Simplified */}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                <Link 
                  href="/" 
                  className="hover:text-emerald-600 transition-colors flex-shrink-0 dark:hover:text-emerald-400"
                >
                  Home
                </Link>
                <ChevronRight className="h-3 w-3 flex-shrink-0 text-gray-400 dark:text-slate-600" />
                <Link 
                  href="/blog" 
                  className="hover:text-emerald-600 transition-colors flex-shrink-0 dark:hover:text-emerald-400"
                >
                  Blog
                </Link>
                <ChevronRight className="h-3 w-3 flex-shrink-0 text-gray-400 dark:text-slate-600" />
                <Link 
                  href={authorProfileUrl}
                  className="hover:text-emerald-600 transition-colors truncate dark:hover:text-emerald-400 font-medium inline-flex items-center gap-1"
                >
                  {authorDisplayName}
                  {authorIsVerified && (
                    <span className="h-3 w-3 text-emerald-500">✓</span>
                  )}
                </Link>
                
                {/* Desktop only - Full breadcrumb */}
                <div className="hidden md:flex items-center gap-2">
                  <ChevronRight className="h-3 w-3 flex-shrink-0 text-gray-400 dark:text-slate-600" />
                  <span className="truncate font-semibold text-gray-900 dark:text-slate-100">
                    {post.title.length > 40 ? `${post.title.substring(0, 40)}...` : post.title}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Share Button */}
            <div className="relative flex-shrink-0 flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareMenu(!showShareMenu);
                }}
                className="h-9 w-9 sm:h-10 sm:w-10 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl transition-colors"
              >
                <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-slate-300" />
              </Button>

              {/* Share Menu Dropdown */}
              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-12 w-52 rounded-2xl border border-gray-200/60 bg-white/95 py-2 shadow-2xl backdrop-blur-xl transition-colors dark:border-slate-700/60 dark:bg-slate-900/95"
                  >
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button
                        onClick={() => sharePost('native')}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-slate-700 transition-colors hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-500/10"
                      >
                        <Share2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Share
                      </button>
                    )}
                    <button
                      onClick={() => sharePost('facebook')}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-slate-700 transition-colors hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-blue-500/10"
                    >
                      <Facebook className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Facebook
                    </button>
                    <button
                      onClick={() => sharePost('twitter')}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-slate-700 transition-colors hover:bg-sky-50 dark:text-slate-200 dark:hover:bg-sky-500/10"
                    >
                      <Twitter className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                      Twitter
                    </button>
                    <button
                      onClick={() => sharePost('linkedin')}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-slate-700 transition-colors hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-blue-500/10"
                    >
                      <Linkedin className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                      LinkedIn
                    </button>
                    <div className="mx-4 my-1 border-t border-gray-200 dark:border-slate-700" />
                    <button
                      onClick={() => sharePost('copy')}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-slate-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                      Copy Link
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Article Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="mb-8 sm:mb-10"
        >
          {/* Category Badge */}
          <div className="mb-4 sm:mb-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              {getCategoryDisplay(post.category)}
            </motion.div>
          </div>

          {/* Title - Mobile Responsive with Gradient */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 dark:text-slate-100 mb-5 sm:mb-6 leading-[1.1] tracking-tight">
            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-slate-100 dark:via-slate-200 dark:to-slate-100 bg-clip-text">
              {post.title}
            </span>
          </h1>

          {/* Meta Information - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4 sm:gap-6 text-sm text-gray-600 dark:text-slate-400 mb-5 sm:mb-6">
            {/* Author Info */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative avatar-ring">
                <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30 ring-2 ring-white dark:ring-slate-900">
                  {authorAvatar ? (
                    <Image
                      src={authorAvatar}
                      alt={authorDisplayName}
                      width={56}
                      height={56}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 pulse-glow" />
              </div>
              <div className="min-w-0 flex-1">
                <Link 
                  href={authorProfileUrl} 
                  className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors flex items-center gap-1.5 dark:text-slate-100 dark:hover:text-emerald-400 text-base"
                >
                  {authorDisplayName}
                  {authorIsVerified && (
                    <span className="text-emerald-500 text-sm">✓</span>
                  )}
                </Link>
                {authorUsername && (
                  <p className="text-xs text-gray-500 dark:text-slate-500">@{authorUsername}</p>
                )}
                {post.author._count && (
                  <p className="text-xs text-gray-500 dark:text-slate-500 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {post.author._count.blogPosts} posts
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-slate-600" />
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {post.author._count.followers} followers
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Meta Stats - Responsive Layout */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-800 text-xs font-medium">
                <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{format(new Date(post.publishedAt || post.createdAt), 'MMM d, yyyy')}</span>
              </div>
              {post.readingTime && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{post.readingTime} min read</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-xs font-medium text-blue-700 dark:text-blue-300">
                <Eye className="h-3.5 w-3.5" />
                <span>{post.viewCount.toLocaleString()} views</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Featured Image - Mobile Responsive with Premium Styling */}
        {post.featuredImage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative mb-8 sm:mb-10 overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl shadow-gray-300/50 dark:shadow-black/30 ring-1 ring-gray-200/50 dark:ring-slate-700/50"
          >
            <div className="aspect-video">
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
            {/* Subtle overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
          </motion.div>
        )}

        {/* Action Buttons - Mobile Responsive with Premium Styling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5 border-y border-gray-200/70 dark:border-slate-800/80 mb-8 sm:mb-10"
        >
          <div className="flex items-center gap-4 sm:gap-6">
            <LikeButton postId={post.id} initialCount={post._count?.likedBy || 0} />
            <div className="flex items-center gap-1 sm:gap-2 text-gray-600 dark:text-slate-300">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">{post._count?.comments || 0}</span>
            </div>
            <button className="flex items-center gap-1 sm:gap-2 text-gray-600 transition-colors hover:text-emerald-500 dark:text-slate-300 dark:hover:text-emerald-400">
              <Bookmark className={`h-4 w-4 sm:h-5 sm:w-5 ${isSaved ? 'fill-emerald-500 text-emerald-500' : ''}`} />
              <span className="text-sm sm:text-base">0</span>
            </button>
          </div>

          {/* Follow Button */}
          <div className="flex items-center gap-3">
            {!isOwnPost && (
              <>
                <FollowButton userId={post.author.id} />
                {/* Use authorProfileId for support API - fallback to authorUsername */}
                {(post.authorProfileId || post.authorUsername) && (
                  <SupportButton 
                    authorId={post.authorProfileId || post.authorUsername || ''}
                    authorName={authorDisplayName}
                    blogPostId={post.id}
                    blogPostTitle={post.title}
                    variant="default"
                  />
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Article Content - Mobile Responsive with Premium Styling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="mb-10 sm:mb-14"
        >
          {/* Inline Table of Contents */}
          <TableOfContents content={post.content || ''} />
          
          <div className="relative rounded-3xl border border-slate-200/70 bg-white px-5 py-8 shadow-xl shadow-emerald-500/5 ring-1 ring-white/50 backdrop-blur-sm transition-all duration-300 dark:border-slate-800/70 dark:bg-slate-900/80 dark:shadow-emerald-500/10 dark:ring-slate-800/50 sm:px-10 sm:py-12">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            
            {/* Content with progressive chunked loading for mobile */}
            <div className="relative prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-pre:bg-slate-100 dark:prose-pre:bg-slate-800 prose-code:text-emerald-600 dark:prose-code:text-emerald-400">
              <ChunkedMarkdownContent 
                content={post.content || ''} 
                enableChunking={true}
                initialChunkSize={1500}
                chunkSize={2000}
              />
            </div>
          </div>
        </motion.div>

        {/* Tags - Mobile Responsive with Premium Styling */}
        {post.tags && post.tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="mb-10 sm:mb-14"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4 sm:mb-5 flex items-center gap-2">
              <Tag className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {post.tags.map((tagRelation, index) => (
                <motion.div
                  key={tagRelation.tag.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.05, duration: 0.3 }}
                >
                  <Link href={`/blog?tag=${tagRelation.tag.slug}`}>
                    <Badge className="tag-chip group cursor-pointer text-sm px-4 py-2 hover:scale-105 transition-all duration-200">
                      <span className="text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">#</span>
                      {tagRelation.tag.name}
                    </Badge>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Author Card - Mobile Responsive with Premium Styling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="mb-10 sm:mb-14"
        >
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 rounded-2xl">
            {/* Decorative top border */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400" />
            
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8">
                <div className="relative avatar-ring">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-xl shadow-emerald-500/30 ring-4 ring-white dark:ring-slate-900">
                    {authorAvatar ? (
                      <Image
                        src={authorAvatar}
                        alt={authorDisplayName}
                        width={96}
                        height={96}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                    )}
                  </div>
                  {authorIsVerified && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-3 border-white dark:border-slate-900 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
                    <Link href={authorProfileUrl} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-2">
                      {authorDisplayName}
                      {authorIsVerified && (
                        <span className="text-emerald-500 text-lg">✓</span>
                      )}
                    </Link>
                  </h3>
                  {authorUsername && (
                    <p className="text-sm text-gray-500 dark:text-slate-500 mb-2">@{authorUsername}</p>
                  )}
                  {authorBio && (
                    <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 mb-4 leading-relaxed line-clamp-2">
                      {authorBio}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    {post.author._count && (
                      <>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="font-medium">{post.author._count.followers}</span>
                          <span className="text-gray-400 dark:text-slate-500">followers</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                            <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-medium">{post.author._count.blogPosts}</span>
                          <span className="text-gray-400 dark:text-slate-500">posts</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {!isOwnPost && (
                  <div className="flex-shrink-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                    <FollowButton userId={post.author.id} />
                    {/* Use authorProfileId for support API - fallback to authorUsername */}
                    {(post.authorProfileId || post.authorUsername) && (
                      <SupportButton 
                        authorId={post.authorProfileId || post.authorUsername || ''}
                        authorName={authorDisplayName}
                        blogPostId={post.id}
                        blogPostTitle={post.title}
                        variant="compact"
                      />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Comments Section - Mobile Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="mb-10 sm:mb-14"
        >
          <BlogComments postId={post.id} />
        </motion.div>

        {/* Related Posts - Mobile Responsive with Premium Styling */}
        {relatedPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="mb-10 sm:mb-14"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 sm:mb-8 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl shadow-lg shadow-purple-500/30">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              Related Posts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {relatedPosts.slice(0, 3).map((relatedPost, index) => {
                // Use username-based URL if available, otherwise fall back to authorName
                const relatedAuthorUsername = relatedPost.authorUsername || relatedPost.author.username;
                const relatedPostUrl = relatedAuthorUsername 
                  ? `/blog/${relatedAuthorUsername}/${relatedPost.slug}`
                  : `/blog/${relatedPost.author.name?.replace(/\s+/g, '-').toLowerCase()}/${relatedPost.slug}`;
                const relatedAuthorDisplayName = relatedPost.authorDisplayName || relatedPost.author.displayName || relatedPost.author.name;
                
                return (
                  <motion.div
                    key={relatedPost.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + index * 0.1, duration: 0.4 }}
                    whileHover={{ y: -6 }}
                    className="group"
                  >
                    <Link
                      href={relatedPostUrl}
                      className="block rounded-2xl border border-gray-200/60 bg-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200/60 dark:border-slate-800/60 dark:bg-slate-900/80 dark:hover:border-emerald-500/30 dark:hover:shadow-emerald-500/20"
                    >
                      {relatedPost.featuredImage && (
                        <div className="relative aspect-video overflow-hidden image-hover-zoom">
                          <Image
                            src={relatedPost.featuredImage}
                            alt={relatedPost.title}
                            fill
                            className="object-cover transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      )}
                      <div className="p-5">
                        <h4 className="font-bold text-gray-900 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {relatedPost.title}
                        </h4>
                        <MarkdownExcerpt
                          content={relatedPost.excerpt}
                          clampLines={2}
                          className="text-sm text-gray-600 dark:text-slate-400 mb-4 leading-relaxed"
                        />
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-500">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-slate-800 rounded-full">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(relatedPost.publishedAt || relatedPost.createdAt), 'MMM d')}
                          </span>
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-slate-800 rounded-full">
                            <Eye className="h-3 w-3" />
                            {relatedPost.viewCount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating Back to Top/Bottom Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
          >
            {/* Scroll to Top */}
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3.5 rounded-full shadow-xl backdrop-blur-sm transition-all duration-300 ${
                !isNearBottom 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60 ring-2 ring-white/20' 
                  : 'bg-white/90 dark:bg-slate-800/90 text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
              }`}
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>

            {/* Scroll to Bottom */}
            <motion.button
              onClick={scrollToBottom}
              whileHover={{ scale: 1.1, y: 2 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3.5 rounded-full shadow-xl backdrop-blur-sm transition-all duration-300 ${
                isNearBottom 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60 ring-2 ring-white/20' 
                  : 'bg-white/90 dark:bg-slate-800/90 text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
              }`}
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="h-5 w-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-200 dark:border-emerald-900" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
        </div>
        <p className="text-gray-600 dark:text-slate-400 font-medium">Loading article...</p>
      </div>
    </div>
  );
}

export default function BlogPostPage({ post, relatedPosts = [] }: BlogPostPageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <MobileBlogPost post={post} relatedPosts={relatedPosts} />
    </Suspense>
  );
}