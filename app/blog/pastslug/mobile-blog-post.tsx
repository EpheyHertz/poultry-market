'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  Link as LinkIcon,
  Tag,
  Heart,
  Users,
  ChevronRight,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import MarkdownExcerpt from '@/components/blog/markdown-excerpt';

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
      <div className="min-h-screen bg-white">
        {/* Loading Skeleton */}
        <div className="animate-pulse">
          <div className="h-48 sm:h-64 lg:h-96 bg-gray-200"></div>
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Post not found</h1>
          <p className="text-gray-600 mb-4">The blog post you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/blog">
            <Button size="sm">← Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb Navigation */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <nav className="flex items-center text-sm text-gray-600">
            <Link href="/blog" className="hover:text-emerald-600 transition-colors">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-gray-900 truncate">{post.title}</span>
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
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-emerald-600">
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <MarkdownExcerpt
              content={post.excerpt}
              clampLines={4}
              className="text-lg text-gray-600 mb-6"
            />
          )}

          {/* Meta Information */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b">
            {/* Author Info */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-600 rounded-full flex items-center justify-center">
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
                <Link href={`/blog/author/${post.author.id}`} className="font-medium text-gray-900 hover:text-emerald-600">
                  {post.author.name}
                </Link>
                {post.author._count && (
                  <div className="text-xs text-gray-500">
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
                  <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-lg p-2 z-10 min-w-32">
                    <button
                      onClick={() => handleShare('facebook')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    >
                      <Facebook className="h-4 w-4" />
                      Facebook
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    >
                      <Twitter className="h-4 w-4" />
                      Twitter
                    </button>
                    <button
                      onClick={() => handleShare('linkedin')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </button>
                    <button
                      onClick={() => handleShare('copy')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 rounded"
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
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-4">
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
        <div className="prose prose-lg max-w-none mb-12">
          <div className="text-gray-900 leading-relaxed">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({children}) => <h1 className="text-3xl font-bold text-gray-900 mb-6">{children}</h1>,
                h2: ({children}) => <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">{children}</h2>,
                h3: ({children}) => <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">{children}</h3>,
                p: ({children}) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
                ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
                li: ({children}) => <li className="text-gray-700">{children}</li>,
                blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-emerald-500 pl-4 py-2 my-6 bg-emerald-50 text-emerald-800 italic">
                    {children}
                  </blockquote>
                ),
                code: ({children}) => (
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                    {children}
                  </code>
                ),
                pre: ({children}) => (
                  <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
                a: ({href, children}) => (
                  <a 
                    href={href} 
                    className="text-emerald-600 hover:text-emerald-700 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                img: ({src, alt}) => (
                  <div className="my-6">
                    <Image
                      src={src || ''}
                      alt={alt || ''}
                      width={800}
                      height={400}
                      className="rounded-lg object-cover w-full"
                    />
                  </div>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link key={tag.id} href={`/blog?tag=${tag.slug}`}>
                  <Badge variant="secondary" className="hover:bg-emerald-100 hover:text-emerald-700">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Author Bio */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="h-16 w-16 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
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
                <h3 className="text-xl font-semibold mb-2">
                  <Link href={`/blog/author/${post.author.id}`} className="hover:text-emerald-600">
                    {post.author.name}
                  </Link>
                </h3>
                {post.author.bio && (
                  <p className="text-gray-600 mb-3">{post.author.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
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
                <Card key={relatedPost.id} className="group hover:shadow-lg transition-shadow">
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
                      className="text-xs text-gray-600 mb-3"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500">
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