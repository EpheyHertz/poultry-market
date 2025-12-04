'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import BlogComments from '@/components/blog/blog-comments';
import LikeButton from '@/components/blog/like-button';
import FollowButton from '@/components/blog/follow-button';
import { BlogPost, BLOG_CATEGORIES } from '@/types/blog';
import MarkdownExcerpt from '@/components/blog/markdown-excerpt';
import MarkdownContent from '@/components/blog/markdown-content';

interface BlogPostPageProps {
  post: BlogPost;
  relatedPosts?: BlogPost[];
}

const CONTENT_CHARS_PER_CHUNK = 3600;

function chunkMarkdownContent(content: string, maxLength: number = CONTENT_CHARS_PER_CHUNK): string[] {
  if (!content) {
    return [];
  }

  if (content.length <= maxLength) {
    return [content];
  }

  const paragraphs = content.split(/\n{2,}/);
  const chunks: string[] = [];
  let buffer = '';

  paragraphs.forEach((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.length >= maxLength * 1.2) {
      if (buffer) {
        chunks.push(buffer.trim());
        buffer = '';
      }
      let cursor = 0;
      while (cursor < trimmed.length) {
        const slice = trimmed.slice(cursor, cursor + maxLength).trim();
        if (slice) {
          chunks.push(slice);
        }
        cursor += maxLength;
      }
      return;
    }

    const candidate = buffer ? `${buffer}\n\n${trimmed}` : trimmed;
    if (candidate.length > maxLength && buffer) {
      chunks.push(buffer.trim());
      buffer = trimmed;
    } else if (candidate.length > maxLength) {
      chunks.push(trimmed);
      buffer = '';
    } else {
      buffer = candidate;
    }
  });

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks.length ? chunks : [content];
}

function MobileBlogPost({ post, relatedPosts = [] }: BlogPostPageProps) {
  const router = useRouter();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [visibleChunks, setVisibleChunks] = useState(1);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [isExpandingContent, setIsExpandingContent] = useState(false);
  const isExpandingRef = useRef(false); // Ref for immediate access in scroll handler
  const contentChunks = useMemo(() => chunkMarkdownContent(post.content || '', CONTENT_CHARS_PER_CHUNK), [post.content]);

  // Track scroll position for back to top/bottom button
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      // Skip scroll updates during content expansion using ref (immediate access)
      if (isExpandingRef.current) return;
      
      if (!ticking) {
        requestAnimationFrame(() => {
          if (!isExpandingRef.current) {
            const scrollTop = window.scrollY;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            // Show button after scrolling 400px
            setShowScrollButton(scrollTop > 400);
            
            // Check if near bottom (within 600px of bottom)
            setIsNearBottom(scrollTop + windowHeight >= documentHeight - 600);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
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

  useEffect(() => {
    setVisibleChunks(contentChunks.length ? 1 : 0);
  }, [post.id, contentChunks.length]);

  const displayedChunks = contentChunks.slice(0, Math.min(visibleChunks, contentChunks.length));
  const hasMoreChunks = visibleChunks < contentChunks.length;
  const remainingChunks = Math.max(contentChunks.length - visibleChunks, 0);

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

  const handleManualLoadMore = () => {
    if (isExpandingRef.current) return; // Prevent multiple clicks
    
    // Set refs and state to block scroll handling
    isExpandingRef.current = true;
    setIsExpandingContent(true);
    
    // Save current scroll position before expanding
    const scrollY = window.scrollY;
    
    // Directly update visible chunks
    setVisibleChunks((prev) => Math.min(prev + 1, contentChunks.length));
    
    // Restore scroll position immediately after state update
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
    
    // Reset after DOM has settled
    setTimeout(() => {
      isExpandingRef.current = false;
      setIsExpandingContent(false);
    }, 500);
  };

  const handleShowAllContent = () => {
    if (isExpandingRef.current) return; // Prevent multiple clicks
    
    isExpandingRef.current = true;
    setIsExpandingContent(true);
    
    // Save current scroll position before expanding
    const scrollY = window.scrollY;
    
    setVisibleChunks(contentChunks.length);
    
    // Restore scroll position immediately after state update
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
    
    setTimeout(() => {
      isExpandingRef.current = false;
      setIsExpandingContent(false);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950">
      {/* Mobile Navigation Header */}
  <div className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950/95">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Mobile Back Button & Breadcrumb */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="h-8 w-8 sm:h-10 sm:w-10 p-0 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              </Button>

              {/* Mobile Breadcrumb - Simplified */}
              <div className="flex items-center gap-1 sm:gap-2 min-w-0 text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                <Link 
                  href="/" 
                  className="hover:text-emerald-600 transition-colors flex-shrink-0 dark:hover:text-emerald-400"
                >
                  Home
                </Link>
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
                <Link 
                  href="/blog" 
                  className="hover:text-emerald-600 transition-colors flex-shrink-0 dark:hover:text-emerald-400"
                >
                  Blog
                </Link>
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
                <Link 
                  href={`/blog/author/${post.author.id}`}
                  className="hover:text-emerald-600 transition-colors truncate dark:hover:text-emerald-400"
                >
                  {post.author.name}
                </Link>
                
                {/* Desktop only - Full breadcrumb */}
                <div className="hidden md:flex items-center gap-2">
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate font-medium text-gray-900 dark:text-slate-100">
                    {post.title.length > 40 ? `${post.title.substring(0, 40)}...` : post.title}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Share Button */}
            <div className="relative flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareMenu(!showShareMenu);
                }}
                className="h-8 w-8 sm:h-10 sm:w-10 p-0"
              >
                <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white/95 py-2 shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-900/95">
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      onClick={() => sharePost('native')}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  )}
                  <button
                    onClick={() => sharePost('facebook')}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </button>
                  <button
                    onClick={() => sharePost('twitter')}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </button>
                  <button
                    onClick={() => sharePost('linkedin')}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </button>
                  <button
                    onClick={() => sharePost('copy')}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Article Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 sm:mb-8"
        >
          {/* Category */}
          <div className="mb-3 sm:mb-4">
            {getCategoryDisplay(post.category)}
          </div>

          {/* Title - Mobile Responsive */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-slate-100 mb-4 sm:mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta Information - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-6 text-sm text-gray-600 dark:text-slate-300 mb-4 sm:mb-6">
            {/* Author Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner shadow-emerald-500/40 dark:shadow-emerald-400/30">
                {post.author.avatar ? (
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link 
                  href={`/blog/author/${post.author.id}`} 
                  className="font-medium text-gray-900 hover:text-emerald-600 transition-colors truncate block dark:text-slate-100 dark:hover:text-emerald-400"
                >
                  {post.author.name}
                </Link>
                {post.author._count && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {post.author._count.blogPosts} posts • {post.author._count.followers} followers
                  </p>
                )}
              </div>
            </div>

            {/* Meta Stats - Responsive Layout */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{format(new Date(post.publishedAt || post.createdAt), 'MMM d, yyyy')}</span>
              </div>
              {post.readingTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{post.readingTime} min read</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{post.viewCount.toLocaleString()} views</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Featured Image - Mobile Responsive */}
        {post.featuredImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative aspect-video mb-6 sm:mb-8 overflow-hidden rounded-lg sm:rounded-2xl"
          >
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </motion.div>
        )}

        {/* Action Buttons - Mobile Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-y border-gray-200/70 dark:border-slate-800/80 mb-6 sm:mb-8"
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
          {!isOwnPost && (
            <FollowButton userId={post.author.id} />
          )}
        </motion.div>

        {/* Article Content - Mobile Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8 sm:mb-12"
        >
          <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-6 shadow-lg shadow-emerald-500/5 ring-1 ring-transparent backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-emerald-500/10 sm:px-8 sm:py-10">
            {displayedChunks.map((chunk, index) => (
              <div
                key={`post-chunk-${post.id}-${index}`}
                className={index > 0 ? 'pt-6 mt-6 border-t border-slate-200/70 dark:border-slate-800/80' : ''}
              >
                <MarkdownContent content={chunk} />
              </div>
            ))}

            {hasMoreChunks && (
              <div className="mt-8 flex flex-col items-center gap-3 text-center">
                <div className="relative w-full">
                  <div className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-b from-transparent via-white/80 to-white dark:via-slate-950/60 dark:to-slate-950" />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleManualLoadMore}
                    disabled={isExpandingContent}
                    className="rounded-full min-w-[120px]"
                  >
                    {isExpandingContent ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Loading...
                      </span>
                    ) : (
                      'Read more'
                    )}
                  </Button>
                  {remainingChunks > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowAllContent}
                      disabled={isExpandingContent}
                      className="rounded-full"
                    >
                      Show full article
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {remainingChunks === 1
                    ? 'Tap to reveal the final section.'
                    : `Tap to reveal ${remainingChunks} more sections.`}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tags - Mobile Responsive */}
        {post.tags && post.tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-8 sm:mb-12"
          >
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {post.tags.map((tagRelation, index) => (
                <Link key={tagRelation.tag.id} href={`/blog?tag=${tagRelation.tag.slug}`}>
                  <Badge variant="secondary" className="inline-flex items-center transition-colors hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300">
                    <Tag className="h-3 w-3 mr-1" />
                    {tagRelation.tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Author Card - Mobile Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-8 sm:mb-12"
        >
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                  {post.author.avatar ? (
                    <Image
                      src={post.author.avatar}
                      alt={post.author.name}
                      width={80}
                      height={80}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">
                    <Link href={`/blog/author/${post.author.id}`} className="hover:text-emerald-600">
                      {post.author.name}
                    </Link>
                  </h3>
                  {post.author.bio && (
                    <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-3 leading-relaxed">
                      {post.author.bio}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                    {post.author._count && (
                      <>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{post.author._count.followers} followers</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          <span>{post.author._count.blogPosts} posts</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {!isOwnPost && (
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    <FollowButton userId={post.author.id} />
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
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-8 sm:mb-12"
        >
          <BlogComments postId={post.id} />
        </motion.div>

        {/* Related Posts - Mobile Responsive */}
        {relatedPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mb-8 sm:mb-12"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
              Related Posts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {relatedPosts.slice(0, 3).map((relatedPost) => {
                const authorName = relatedPost.author.name.replace(/\s+/g, '-').toLowerCase();
                return (
                  <Link
                    key={relatedPost.id}
                    href={`/blog/${authorName}/${relatedPost.slug}`}
                    className="group block rounded-lg border border-gray-200 bg-white/95 sm:rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80"
                  >
                    {relatedPost.featuredImage && (
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={relatedPost.featuredImage}
                          alt={relatedPost.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-4 sm:p-5">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base line-clamp-2 group-hover:text-emerald-600 transition-colors">
                        {relatedPost.title}
                      </h4>
                      <MarkdownExcerpt
                        content={relatedPost.excerpt}
                        clampLines={2}
                        className="text-xs sm:text-sm text-gray-600 mb-2"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {format(new Date(relatedPost.publishedAt || relatedPost.createdAt), 'MMM d')}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Eye className="h-3 w-3" />
                          <span>{relatedPost.viewCount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
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
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
          >
            {/* Scroll to Top */}
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-full shadow-lg transition-all duration-300 ${
                !isNearBottom 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>

            {/* Scroll to Bottom */}
            <motion.button
              onClick={scrollToBottom}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-full shadow-lg transition-all duration-300 ${
                isNearBottom 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading article...</p>
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