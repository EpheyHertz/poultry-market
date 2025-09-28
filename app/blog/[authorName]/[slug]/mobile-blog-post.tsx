'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  User, 
  Bookmark,
  BookOpen,
  Facebook,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  ChevronRight,
  Home,
  Menu,
  X,
  Tag,
  Users,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import BlogComments from '@/components/blog/blog-comments';
import LikeButton from '@/components/blog/like-button';
import FollowButton from '@/components/blog/follow-button';
import { BlogPost, BLOG_CATEGORIES } from '@/types/blog';

interface BlogPostPageProps {
  post: BlogPost;
  relatedPosts?: BlogPost[];
}

function MobileBlogPost({ post, relatedPosts = [] }: BlogPostPageProps) {
  const router = useRouter();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
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
              <div className="flex items-center gap-1 sm:gap-2 min-w-0 text-xs sm:text-sm text-gray-600">
                <Link 
                  href="/" 
                  className="hover:text-emerald-600 transition-colors flex-shrink-0"
                >
                  Home
                </Link>
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
                <Link 
                  href="/blog" 
                  className="hover:text-emerald-600 transition-colors flex-shrink-0"
                >
                  Blog
                </Link>
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
                <Link 
                  href={`/blog/author/${post.author.id}`}
                  className="hover:text-emerald-600 transition-colors truncate"
                >
                  {post.author.name}
                </Link>
                
                {/* Desktop only - Full breadcrumb */}
                <div className="hidden md:flex items-center gap-2">
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate text-gray-900 font-medium">
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
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      onClick={() => sharePost('native')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  )}
                  <button
                    onClick={() => sharePost('facebook')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </button>
                  <button
                    onClick={() => sharePost('twitter')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </button>
                  <button
                    onClick={() => sharePost('linkedin')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </button>
                  <button
                    onClick={() => sharePost('copy')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta Information - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-6 text-sm text-gray-600 mb-4 sm:mb-6">
            {/* Author Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
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
                  className="font-medium text-gray-900 hover:text-emerald-600 transition-colors truncate block"
                >
                  {post.author.name}
                </Link>
                {post.author._count && (
                  <p className="text-xs text-gray-500">
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
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-y border-gray-200 mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-4 sm:gap-6">
            <LikeButton postId={post.id} initialCount={post._count?.likedBy || 0} />
            <div className="flex items-center gap-1 sm:gap-2 text-gray-600">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">{post._count?.comments || 0}</span>
            </div>
            <button className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-emerald-500 transition-colors">
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
          className="prose prose-lg max-w-none prose-emerald mb-8 sm:mb-12"
        >
          <div className="text-base sm:text-lg leading-relaxed text-gray-700">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ src, alt, ...props }) => (
                  <div className="relative my-6 sm:my-8">
                    <Image
                      src={src || ''}
                      alt={alt || ''}
                      width={800}
                      height={400}
                      className="rounded-lg sm:rounded-xl object-cover w-full"
                    />
                  </div>
                ),
                h1: ({ children }) => <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 mt-6 sm:mt-8">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 mt-6 sm:mt-8">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 mt-4 sm:mt-6">{children}</h3>,
                p: ({ children }) => <p className="mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed text-gray-700">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 sm:mb-6 pl-4 sm:pl-6 space-y-1 sm:space-y-2 list-disc list-inside text-gray-700">{children}</ul>,
                ol: ({ children }) => <ol className="mb-4 sm:mb-6 pl-4 sm:pl-6 space-y-1 sm:space-y-2 list-decimal list-inside text-gray-700">{children}</ol>,
                li: ({ children }) => <li className="text-sm sm:text-base leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-emerald-500 pl-4 sm:pl-6 py-2 sm:py-4 my-4 sm:my-6 bg-emerald-50 italic text-sm sm:text-base text-gray-700">
                    {children}
                  </blockquote>
                ),
                code: ({ children, ...props }) => (
                  <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm" {...props}>
                    {children}
                  </code>
                ),
                pre: ({ children, ...props }) => (
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm my-4" {...props}>
                    {children}
                  </pre>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
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
                  <Badge variant="secondary" className="hover:bg-emerald-100 hover:text-emerald-700 inline-flex items-center">
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
                    className="group block bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
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
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
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