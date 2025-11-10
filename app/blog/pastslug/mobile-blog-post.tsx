'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BlogComments from '@/components/blog/blog-comments';
import LikeButton from '@/components/blog/like-button';
import FollowButton from '@/components/blog/follow-button';
import { 
  Calendar,
  Clock,
  User,
  Eye,
  MessageCircle,
  Share2,
  ArrowLeft,
  Facebook,
  Twitter,
  Linkedin,
  Tag,
  Users,
  ChevronRight,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import MarkdownExcerpt from '@/components/blog/markdown-excerpt';
import MarkdownContent from '@/components/blog/markdown-content';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  category: string;
  viewCount: number;
  readingTime?: number | null;
  publishedAt: string | Date | null;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
    bio?: string | null;
    _count?: {
      followers: number;
      blogPosts: number;
    };
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  relatedPosts: BlogPost[];
  _count: {
    likes: number;
    comments: number;
  };
}

interface Props {
  params: Promise<{
    slug: string;
  }>;
  initialPost?: BlogPost;
}

export default function MobileBlogPost({ params, initialPost }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const fetchPost = useCallback(async () => {
    // Only fetch if we don't have initial data
    if (initialPost) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/blog/posts/${resolvedParams.slug}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data); // The API returns the post data directly, not wrapped in { post: ... }
      } else {
        router.push('/blog');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      router.push('/blog');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.slug, router, initialPost]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const title = post?.title || '';

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`);
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Link copied to clipboard!');
        } catch (err) {
          toast.error('Failed to copy link');
        }
        break;
    }
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950">
        {/* Loading Skeleton */}
        <div className="animate-pulse">
          <div className="h-48 sm:h-64 lg:h-96 bg-gray-200"></div>
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            <div className="h-8 w-3/4 rounded bg-gray-200"></div>
            <div className="h-4 w-1/2 rounded bg-gray-200"></div>
            <div className="space-y-2">
              <div className="h-4 rounded bg-gray-200"></div>
              <div className="h-4 rounded bg-gray-200"></div>
              <div className="h-4 w-2/3 rounded bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Post not found</h1>
          <p className="text-gray-600 dark:text-slate-300 mb-4">The blog post you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/blog">
            <Button size="sm">← Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-200 bg-white/95 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950/95">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <nav className="flex items-center text-sm text-gray-600 dark:text-slate-300">
            <Link href="/blog" className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="truncate text-gray-900 dark:text-slate-100">{post.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero Image */}
      {post.featuredImage && (
        <div className="relative h-48 sm:h-64 lg:h-96 bg-gray-200">
          <Image
            src={post.featuredImage}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 transition-colors hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400">
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
        </div>

        {/* Article Header */}
        <div className="mb-8">
          {/* Category */}
          {post.category && (
            <Badge className="mb-4 bg-emerald-600 text-white">
              {post.category}
            </Badge>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <MarkdownExcerpt
              content={post.excerpt}
              clampLines={4}
              className="text-lg text-gray-600 dark:text-slate-300 mb-6"
            />
          )}

          {/* Meta Information */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200/70 dark:border-slate-800/70">
            {/* Author Info */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-600 rounded-full flex items-center justify-center shadow-inner shadow-emerald-500/30 dark:shadow-emerald-400/30">
                {post.author.avatar ? (
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <User className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <Link href={`/blog/author/${post.author.id}`} className="font-medium text-gray-900 hover:text-emerald-600 dark:text-slate-100 dark:hover:text-emerald-400">
                  {post.author.name}
                </Link>
                {post.author._count && (
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {post.author._count.followers} followers • {post.author._count.blogPosts} posts
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <LikeButton postId={post.id} initialCount={post._count.likes} />
              <FollowButton userId={post.author.id} />
              
              {/* Share Button */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                
                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-2 min-w-32 rounded-lg border border-gray-200 bg-white/95 p-2 shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-900/95">
                    <button
                      onClick={() => handleShare('facebook')}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Facebook className="h-4 w-4" />
                      Facebook
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Twitter className="h-4 w-4" />
                      Twitter
                    </button>
                    <button
                      onClick={() => handleShare('linkedin')}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </button>
                    <button
                      onClick={() => handleShare('copy')}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Article Meta */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : 'Date not available'}</span>
            </div>
            {post.readingTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{post.readingTime} min read</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{post.viewCount} views</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>{post._count.comments} comments</span>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="mb-12">
          <MarkdownContent
            content={post.content}
            className="rounded-2xl border border-slate-200/70 bg-white px-4 py-6 shadow-lg shadow-emerald-500/5 dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-emerald-500/10 sm:px-8 sm:py-10"
          />
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link key={tag.id} href={`/blog?tag=${tag.slug}`}>
                  <Badge variant="secondary" className="transition-colors hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Author Bio */}
        <Card className="mb-8 border border-gray-200/70 bg-white/95 shadow-sm transition-colors dark:border-slate-800/70 dark:bg-slate-900/80">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="h-16 w-16 flex-shrink-0 rounded-full bg-emerald-600 flex items-center justify-center">
                {post.author.avatar ? (
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-xl font-semibold">
                  <Link
                    href={`/blog/author/${post.author.id}`}
                    className="transition-colors hover:text-emerald-600 dark:text-slate-100 dark:hover:text-emerald-400"
                  >
                    {post.author.name}
                  </Link>
                </h3>
                {post.author.bio && (
                  <p className="mb-3 text-gray-600 dark:text-slate-300">{post.author.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
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
              <div className="flex-shrink-0">
                <FollowButton userId={post.author.id} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Posts */}
        {post.relatedPosts && post.relatedPosts.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-bold mb-6">Related Articles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {post.relatedPosts.slice(0, 3).map((relatedPost) => (
                <Card
                  key={relatedPost.id}
                  className="group border border-gray-200/70 bg-white/95 transition-shadow hover:shadow-lg dark:border-slate-800/70 dark:bg-slate-900/80"
                >
                  <div className="relative aspect-video">
                    {relatedPost.featuredImage ? (
                      <Image
                        src={relatedPost.featuredImage}
                        alt={relatedPost.title}
                        fill
                        className="object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center rounded-t-lg">
                        <Tag className="h-6 w-6 text-emerald-600" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <Link href={`/blog/${relatedPost.author.name.replace(/\s+/g, '-').toLowerCase()}/${relatedPost.slug}`}>
                      <h4 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                        {relatedPost.title}
                      </h4>
                    </Link>
                    <MarkdownExcerpt
                      content={relatedPost.excerpt}
                      clampLines={2}
                      className="text-xs text-gray-600 dark:text-slate-400 mb-3"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                      <span>{relatedPost.author.name}</span>
                      <span>{relatedPost.publishedAt ? format(new Date(relatedPost.publishedAt), 'MMM d') : 'Date N/A'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <BlogComments postId={post.id} />
      </div>
    </div>
  );
}