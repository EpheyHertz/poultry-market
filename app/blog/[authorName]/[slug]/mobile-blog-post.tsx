'use client';

import { useState, useEffect } from 'react';
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

interface Props {
  post: any; // TODO: Type this properly with Prisma types
}

const BLOG_CATEGORIES = {
  FARMING_TIPS: { name: 'Farming Tips', icon: '🌱', color: 'bg-green-100 text-green-800' },
  POULTRY_HEALTH: { name: 'Poultry Health', icon: '🏥', color: 'bg-red-100 text-red-800' },
  FEED_NUTRITION: { name: 'Feed & Nutrition', icon: '🌾', color: 'bg-yellow-100 text-yellow-800' },
  EQUIPMENT_GUIDES: { name: 'Equipment Guides', icon: '🔧', color: 'bg-gray-100 text-gray-800' },
  MARKET_TRENDS: { name: 'Market Trends', icon: '📈', color: 'bg-blue-100 text-blue-800' },
  SUCCESS_STORIES: { name: 'Success Stories', icon: '🏆', color: 'bg-orange-100 text-orange-800' },
  INDUSTRY_NEWS: { name: 'Industry News', icon: '📰', color: 'bg-purple-100 text-purple-800' },
  SEASONAL_ADVICE: { name: 'Seasonal Advice', icon: '🌤️', color: 'bg-cyan-100 text-cyan-800' },
  BEGINNER_GUIDES: { name: 'Beginner Guides', icon: '📚', color: 'bg-lime-100 text-lime-800' },
  ADVANCED_TECHNIQUES: { name: 'Advanced Techniques', icon: '🎯', color: 'bg-pink-100 text-pink-800' }
};

export default function MobileBlogPost({ post }: Props) {
  const router = useRouter();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const authorName = post.author.name.replace(/\\s+/g, '-').toLowerCase();

  const sharePost = async (platform: string) => {
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

  const getCategoryDisplay = (category: string) => {
    const categoryInfo = BLOG_CATEGORIES[category as keyof typeof BLOG_CATEGORIES];
    return categoryInfo ? (
      <Badge className={categoryInfo.color}>
        <span className="mr-1">{categoryInfo.icon}</span>
        {categoryInfo.name}
      </Badge>
    ) : (
      <Badge variant="outline">{category}</Badge>
    );
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/blog" className="hover:text-emerald-600 transition-colors">Blog</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href={`/blog/author/${post.author.id}`} className="hover:text-emerald-600 transition-colors">
                {post.author.name}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900 font-medium truncate">{post.title}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Article Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          {/* Category */}
          <div className="mb-4">
            {getCategoryDisplay(post.category)}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6">
            <div className="flex items-center gap-2">
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
              </div>
            </div>

            {post.publishedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(post.publishedAt), 'MMM d, yyyy')}</span>
              </div>
            )}

            {post.readingTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{post.readingTime} min read</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{post.viewCount.toLocaleString()} views</span>
            </div>
          </div>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="relative aspect-video mb-8 overflow-hidden rounded-2xl">
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between py-4 border-y border-gray-200 mb-8">
            <div className="flex items-center gap-4">
              <LikeButton postId={post.id} initialCount={post._count?.likedBy || 0} />
              <div className="flex items-center gap-1 text-gray-600">
                <MessageCircle className="h-5 w-5" />
                <span>{post._count?.comments || 0}</span>
              </div>
            </div>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
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
        </motion.div>

        {/* Article Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="prose prose-lg max-w-none mb-12"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt, ...props }) => (
                <div className="relative my-8">
                  <Image
                    src={src || ''}
                    alt={alt || ''}
                    width={800}
                    height={400}
                    className="rounded-lg object-cover w-full"
                  />
                </div>
              ),
              h1: ({ children, ...props }) => (
                <h1 className="text-3xl font-bold text-gray-900 mb-4" {...props}>
                  {children}
                </h1>
              ),
              h2: ({ children, ...props }) => (
                <h2 className="text-2xl font-bold text-gray-900 mb-3 mt-8" {...props}>
                  {children}
                </h2>
              ),
              h3: ({ children, ...props }) => (
                <h3 className="text-xl font-bold text-gray-900 mb-2 mt-6" {...props}>
                  {children}
                </h3>
              ),
              p: ({ children, ...props }) => (
                <p className="text-gray-700 leading-relaxed mb-4" {...props}>
                  {children}
                </p>
              ),
              ul: ({ children, ...props }) => (
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2" {...props}>
                  {children}
                </ul>
              ),
              ol: ({ children, ...props }) => (
                <ol className="list-decimal list-inside text-gray-700 mb-4 space-y-2" {...props}>
                  {children}
                </ol>
              ),
              blockquote: ({ children, ...props }) => (
                <blockquote className="border-l-4 border-emerald-500 pl-4 italic text-gray-700 my-6" {...props}>
                  {children}
                </blockquote>
              ),
              code: ({ children, ...props }) => (
                <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm" {...props}>
                  {children}
                </code>
              ),
              pre: ({ children, ...props }) => (
                <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm" {...props}>
                  {children}
                </pre>
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </motion.div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tagItem) => (
                <Link key={tagItem.tag.id} href={`/blog?tag=${tagItem.tag.slug}`}>
                  <Badge variant="secondary" className="hover:bg-emerald-100 hover:text-emerald-700">
                    <Tag className="h-3 w-3 mr-1" />
                    {tagItem.tag.name}
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

        {/* Comments Section */}
        <BlogComments postId={post.id} />
      </div>
    </div>
  );
}