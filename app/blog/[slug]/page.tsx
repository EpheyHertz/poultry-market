'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { generateBlogMetadata, generateBlogStructuredData, generateBlogBreadcrumbData } from '@/components/blog/blog-seo';
import BlogComments from '@/components/blog/blog-comments';
import PublicNavbar from '@/components/layout/public-navbar';
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
  BookOpen,
  Tag,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  images?: string[];
  category: string;
  featured: boolean;
  viewCount: number;
  readingTime?: number;
  publishedAt: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  comments: Comment[];
  relatedPosts: BlogPost[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  guestName?: string;
  replies: Comment[];
}

interface Props {
  params: Promise<{
    slug: string;
  }>;
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

export default function BlogPostPage({ params }: Props) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  // Generate SEO data when post is loaded
  const seoData = post ? {
    metadata: generateBlogMetadata(post),
    structuredData: generateBlogStructuredData(post, `https://poultrymarket.co.ke/blog/${post.slug}`),
    breadcrumbData: generateBlogBreadcrumbData(post)
  } : null;

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/blog/posts/${resolvedParams.slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/blog');
            return;
          }
          throw new Error('Failed to fetch post');
        }

        const data = await response.json();
        setPost(data);

        // Update page metadata
        if (typeof window !== 'undefined') {
          document.title = data.title + ' - Poultry Market KE Blog';
          
          // Update meta description
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', data.metaDescription || data.excerpt || '');
          }
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('Failed to load blog post');
        router.push('/blog');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [resolvedParams.slug, router]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get reading time text
  const getReadingTime = (minutes?: number) => {
    if (!minutes) return 'Quick read';
    return `${minutes} min read`;
  };

  // Render markdown content
  const renderContent = (content: string) => {
    return content
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-gray-900 mt-8 mb-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-gray-900 mt-10 mb-6">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-gray-900 mt-12 mb-8">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(/`(.*)`/gim, '<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-emerald-500 pl-4 py-2 my-4 text-gray-700 italic bg-emerald-50">$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li class="mb-2">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="mb-2">$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-emerald-600 hover:text-emerald-700 underline" target="_blank">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" class="w-full h-auto rounded-lg my-6" />')
      .replace(/\n/gim, '<br>');
  };

  // Share functions
  const sharePost = async (platform: string) => {
    if (!post) return;
    
    setSharing(true);
    const url = window.location.href;
    const title = post.title;
    const text = post.excerpt || post.title;

    try {
      switch (platform) {
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
          break;
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, '_blank');
          break;
        case 'copy':
          await navigator.clipboard.writeText(url);
          toast.success('Link copied to clipboard!');
          break;
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share post');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h1>
          <p className="text-gray-600 mb-6">The article you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Button onClick={() => router.push('/blog')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        {seoData && (
          <>
            <title>{String(seoData.metadata.title || '')}</title>
            <meta name="description" content={seoData.metadata.description || ''} />
            <meta name="keywords" content={Array.isArray(seoData.metadata.keywords) ? seoData.metadata.keywords.join(', ') : seoData.metadata.keywords || ''} />
            <meta property="og:title" content={String(seoData.metadata.openGraph?.title || '')} />
            <meta property="og:description" content={seoData.metadata.openGraph?.description || ''} />
            <meta property="og:image" content={seoData.metadata.openGraph?.images?.[0]?.url || ''} />
            <meta property="og:url" content={String(seoData.metadata.openGraph?.url || '')} />
            <meta property="og:type" content="article" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={String(seoData.metadata.twitter?.title || '')} />
            <meta name="twitter:description" content={seoData.metadata.twitter?.description || ''} />
            <meta name="twitter:image" content={seoData.metadata.twitter?.images?.[0] || ''} />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData.structuredData) }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData.breadcrumbData) }}
            />
          </>
        )}
      </Head>
      
      <PublicNavbar />
      
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
              onClick={() => router.push('/blog')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Blog</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => sharePost('copy')}
                disabled={sharing}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Category & Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <Badge className={BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800'}>
                {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} 
                {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name}
              </Badge>
              
              {post.featured && (
                <Badge className="bg-yellow-500 text-white">
                  ⭐ Featured
                </Badge>
              )}
              
              <div className="flex items-center text-sm text-gray-500 space-x-4">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(post.publishedAt)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{getReadingTime(post.readingTime)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{post.viewCount} views</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.comments.length} comments</span>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Author */}
            <div className="flex items-center space-x-4 mb-8">
              <div className="flex-shrink-0">
                {post.author.avatar ? (
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-emerald-600" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{post.author.name}</p>
                {post.author.bio && (
                  <p className="text-sm text-gray-600">{post.author.bio}</p>
                )}
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center space-x-4 mb-8">
              <span className="text-sm font-medium text-gray-700">Share:</span>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sharePost('facebook')}
                  disabled={sharing}
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sharePost('twitter')}
                  disabled={sharing}
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sharePost('linkedin')}
                  disabled={sharing}
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sharePost('copy')}
                  disabled={sharing}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Featured Image */}
          {post.featuredImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-12"
            >
              <Image
                src={post.featuredImage}
                alt={post.title}
                width={800}
                height={400}
                className="w-full h-96 object-cover rounded-xl shadow-lg"
              />
            </motion.div>
          )}

          {/* Blog Post Images */}
          {post.images && post.images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mb-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {post.images.map((image, index) => (
                  <div key={index} className="relative group cursor-pointer">
                    <Image
                      src={image}
                      alt={`${post.title} - Image ${index + 1}`}
                      width={400}
                      height={300}
                      className="w-full h-64 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-lg" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Article Content */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="mb-8">
                <CardContent className="p-8">
                  <div 
                    className="prose prose-lg max-w-none prose-emerald"
                    dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
                  />
                </CardContent>
              </Card>

              {/* Tags */}
              {post.tags.length > 0 && (
                <Card className="mb-8">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <Tag className="h-5 w-5 text-gray-600" />
                      <span className="font-semibold text-gray-900">Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-emerald-50 hover:border-emerald-300"
                          onClick={() => router.push(`/blog?tag=${tag.slug}`)}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Comments Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-12"
            >
              <BlogComments postId={post.id} />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Related Posts */}
            {post.relatedPosts && post.relatedPosts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Related Articles</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {post.relatedPosts.slice(0, 3).map((relatedPost) => (
                      <Link
                        key={relatedPost.id}
                        href={`/blog/${relatedPost.slug}`}
                        className="block group"
                      >
                        <div className="flex space-x-3">
                          {relatedPost.featuredImage ? (
                            <Image
                              src={relatedPost.featuredImage}
                              alt={relatedPost.title}
                              width={80}
                              height={60}
                              className="w-20 h-15 object-cover rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <div className="w-20 h-15 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                              {relatedPost.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(relatedPost.publishedAt)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Newsletter Signup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardHeader>
                  <CardTitle className="text-emerald-800">Stay Updated</CardTitle>
                  <CardDescription className="text-emerald-700">
                    Get the latest poultry farming tips and industry news delivered to your inbox.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Subscribe to Newsletter
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Back to Blog */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <BookOpen className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">Explore More</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Discover more articles on poultry farming and industry insights.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/blog')}
                    className="w-full"
                  >
                    Browse All Articles
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}