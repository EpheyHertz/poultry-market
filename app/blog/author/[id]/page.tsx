'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PublicNavbar from '@/components/layout/public-navbar';
import FollowButton from '@/components/blog/follow-button';
import { 
  User,
  Calendar,
  BookOpen,
  Users,
  UserPlus,
  Eye,
  MessageCircle,
  Heart,
  ArrowLeft,
  MapPin,
  Globe,
  Twitter,
  Linkedin,
  Facebook,
  Mail,
  TrendingUp,
  Clock,
  Tag,
  Grid3X3,
  List,
  Filter,
  Search,
  ChevronRight,
  PenTool,
  BarChart3,
  ShieldCheck,
  Zap,
  Sparkles,
  Settings,
  LayoutDashboard,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import MarkdownExcerpt from '@/components/blog/markdown-excerpt';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  category: string;
  featured: boolean;
  viewCount: number;
  readingTime?: number;
  publishedAt: string;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  _count: {
    likedBy: number;
    comments: number;
  };
}

interface AuthorProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  createdAt: string;
  _count: {
    blogPosts: number;
    followers: number;
    following: number;
  };
  blogPosts: BlogPost[];
  followers?: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  following?: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
}

interface Props {
  params: Promise<{
    id: string;
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

export default function AuthorProfilePage({ params }: Props) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('latest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;

  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const response = await fetch(`/api/blog/author/${resolvedParams.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/blog');
            return;
          }
          throw new Error('Failed to fetch author');
        }

        const data = await response.json();
        setAuthor(data);
      } catch (error) {
        console.error('Error fetching author:', error);
        toast.error('Failed to load author profile');
        router.push('/blog');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthor();
  }, [resolvedParams.id, router]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

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

  // Filter and sort posts
  const getFilteredPosts = () => {
    if (!author?.blogPosts) return [];
    
    let filtered = author.blogPosts;
    
    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(post => post.category === filterCategory);
    }
    
    // Sort posts
    switch (sortBy) {
      case 'popular':
        filtered = filtered.sort((a, b) => (b._count.likedBy + b.viewCount) - (a._count.likedBy + a.viewCount));
        break;
      case 'oldest':
        filtered = filtered.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
        break;
      case 'latest':
      default:
        filtered = filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }
    
    return filtered;
  };

  const filteredPosts = getFilteredPosts();
  const categories = Array.from(new Set(author?.blogPosts?.map(post => post.category) || [])) as string[];
  
  // Pagination logic
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, sortBy]);

  const analytics = useMemo(() => {
    if (!author?.blogPosts || author.blogPosts.length === 0) {
      return null;
    }

    const posts = author.blogPosts;
    const totals = posts.reduce(
      (acc, post) => {
        const views = post.viewCount || 0;
        const likes = post._count?.likedBy || 0;
        const comments = post._count?.comments || 0;
        const readingTime = post.readingTime || 0;

        acc.views += views;
        acc.likes += likes;
        acc.comments += comments;
        acc.readingTime += readingTime;
        return acc;
      },
      { views: 0, likes: 0, comments: 0, readingTime: 0 }
    );

    const publishedPosts = posts.filter(post => post.publishedAt);
    const trendSource = [...publishedPosts]
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
      .slice(-8)
      .map(post => ({
        label: new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        views: post.viewCount || 0,
        likes: post._count?.likedBy || 0,
        comments: post._count?.comments || 0
      }));

    const trendMax = trendSource.reduce((max, point) => Math.max(max, point.views), 0) || 1;

    const categoriesMap = posts.reduce<Record<string, { count: number; views: number }>>((acc, post) => {
      if (!acc[post.category]) {
        acc[post.category] = { count: 0, views: 0 };
      }
      acc[post.category].count += 1;
      acc[post.category].views += post.viewCount || 0;
      return acc;
    }, {});

    const categoryBreakdown = Object.entries(categoriesMap)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 4);

    const topPosts = [...posts]
      .sort((a, b) => {
        const aScore = (a.viewCount || 0) * 0.6 + (a._count?.likedBy || 0) * 0.3 + (a._count?.comments || 0) * 0.1;
        const bScore = (b.viewCount || 0) * 0.6 + (b._count?.likedBy || 0) * 0.3 + (b._count?.comments || 0) * 0.1;
        return bScore - aScore;
      })
      .slice(0, 3);

    return {
      totals,
      avgReadingTime: posts.length ? Math.max(1, Math.round(totals.readingTime / posts.length)) : null,
      trend: trendSource,
      trendMax,
      categoryBreakdown,
      topPosts
    };
  }, [author]);

  const authorServices = useMemo(() => {
    const isOwner = currentUser && author && currentUser.id === author.id;

    return [
      {
        title: 'Content Studio',
        description: 'Draft, edit, and submit your poultry insights in one place.',
        href: isOwner ? '/my-blogs' : '/blog',
        accent: 'from-emerald-500/90 via-emerald-400 to-lime-400',
        icon: PenTool,
        cta: isOwner ? 'Open workspace' : 'Browse posts'
      },
      {
        title: 'Performance Pulse',
        description: 'Track views, likes, and reader engagement instantly.',
        href: '#author-analytics',
        accent: 'from-blue-500/90 via-sky-500 to-cyan-400',
        icon: BarChart3,
        cta: 'View insights'
      },
      {
        title: 'Collaboration Desk',
        description: 'Partner with brands, request sponsorships, or pitch ideas.',
        href: '/contact',
        accent: 'from-purple-500/90 via-pink-500 to-rose-400',
        icon: Sparkles,
        cta: 'Pitch now'
      },
      {
        title: 'Creator Care',
        description: 'Need help? Talk to editorial support for fast resolutions.',
        href: '/contact',
        accent: 'from-amber-500/90 via-orange-500 to-red-400',
        icon: ShieldCheck,
        cta: 'Get support'
      }
    ];
  }, [author, currentUser]);

  const sparklinePoints = useMemo(() => {
    if (!analytics?.trend.length) return '';
    const points = analytics.trend.map((point, index) => {
      const x = analytics.trend.length === 1 ? 0 : (index / (analytics.trend.length - 1)) * 100;
      const y = 100 - (point.views / (analytics.trendMax || 1)) * 100;
      return `${x},${y}`;
    });
    return points.join(' ');
  }, [analytics]);
  const latestTrendPoint = analytics?.trend?.[analytics.trend.length - 1] || null;
  const totalPostsCount = author?.blogPosts?.length || 0;
  const publishedPostsCount = author?.blogPosts?.filter(post => post.publishedAt)?.length || 0;
  const overviewMetrics = analytics
    ? [
        {
          label: 'Total Views',
          value: analytics.totals.views.toLocaleString(),
          helper: 'Lifetime views on published stories',
          icon: Eye,
          accent: 'text-emerald-600'
        },
        {
          label: 'Reader Interactions',
          value: (analytics.totals.likes + analytics.totals.comments).toLocaleString(),
          helper: 'Likes + comments combined',
          icon: Heart,
          accent: 'text-rose-500'
        },
        {
          label: 'Avg. Reading Time',
          value: analytics.avgReadingTime ? `${analytics.avgReadingTime} min` : '—',
          helper: 'Per article',
          icon: Clock,
          accent: 'text-indigo-600'
        },
        {
          label: 'Published Articles',
          value: publishedPostsCount.toString(),
          helper: `${totalPostsCount} total drafts & published`,
          icon: BookOpen,
          accent: 'text-sky-600'
        }
      ]
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PublicNavbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading author profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <User className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Author not found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">The author profile you&apos;re looking for doesn&apos;t exist.</p>
            <Button onClick={() => router.push('/blog')} variant="outline" className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PublicNavbar />

      {/* Breadcrumb */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/blog" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 dark:text-white font-medium">Authors</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 dark:text-white font-medium truncate">{author.name}</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-emerald-950/30 dark:to-blue-950/30 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 dark:opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, #34d399 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Author Avatar */}
            <div className="relative inline-block mb-6">
              {author.avatar ? (
                <Image
                  src={author.avatar}
                  alt={author.name}
                  width={120}
                  height={120}
                  className="rounded-full mx-auto ring-4 ring-white dark:ring-gray-800 shadow-2xl"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center mx-auto ring-4 ring-white dark:ring-gray-800 shadow-2xl">
                  <User className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
                </div>
              )}
              
              {/* Online indicator */}
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-gray-800"></div>
            </div>

            {/* Author Info */}
            <div className="space-y-4 mb-8">
              <div>
                <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                    {author.name}
                  </h1>
                  {currentUser && currentUser.id === author.id && (
                    <Badge className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0 text-sm px-3 py-1">
                      <User className="h-3.5 w-3.5" />
                      Your Profile
                    </Badge>
                  )}
                </div>

              {/* Creator Services Hub */}
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/60 dark:border-gray-700/60 rounded-3xl shadow-2xl p-6 sm:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Creator services</p>
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-2">{currentUser && currentUser.id === author.id ? 'Your personal control center' : `${author.name}'s content hub`}</h2>
                      <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
                        {currentUser && currentUser.id === author.id 
                          ? 'Launch new stories, monitor performance, and request support without leaving this page.'
                          : 'Explore their published content, engagement metrics, and connect with this author.'}
                      </p>
                    </div>
                    <Badge variant="outline" className="self-start lg:self-auto text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30">Always-on helpdesk</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {authorServices.map((service) => (
                      <Card
                        key={service.title}
                        className={`h-full bg-gradient-to-br ${service.accent} text-white border-none shadow-xl overflow-hidden`}
                      >
                        <CardContent className="p-5 flex flex-col h-full">
                          <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                              <service.icon className="h-6 w-6" />
                            </div>
                            <span className="text-xs uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">Service</span>
                          </div>
                          <div className="space-y-2 flex-1">
                            <h3 className="text-lg font-semibold leading-tight">{service.title}</h3>
                            <p className="text-sm text-white/80 leading-relaxed">{service.description}</p>
                          </div>
                          <Button asChild variant="secondary" className="mt-4 bg-white/90 text-gray-900 hover:bg-white">
                            <Link href={service.href}>{service.cta}</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Analytics + Insights */}
              {analytics && (
                <section id="author-analytics" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Performance overview</p>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">Analytics built for storytellers</h2>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">Understand what readers love and spot the next big opportunity.</p>
                    </div>
                    {latestTrendPoint && (
                      <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-2xl px-5 py-4 shadow-lg w-full md:w-auto border dark:border-gray-700">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Latest spike</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Zap className="h-5 w-5 text-amber-300" />
                          <div>
                            <p className="text-lg font-semibold">{latestTrendPoint.views.toLocaleString()} views</p>
                            <p className="text-xs text-gray-400">Recorded {latestTrendPoint.label}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2 border-gray-100 dark:border-gray-700 dark:bg-gray-800 shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between dark:text-white">
                          <span>Engagement trend</span>
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Last {analytics.trend.length || 0} articles</span>
                        </CardTitle>
                        <CardDescription className="dark:text-gray-400">Views per publication</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {sparklinePoints ? (
                          <div className="space-y-4">
                            <div className="relative w-full h-32">
                              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                                <defs>
                                  <linearGradient id="authorSparkline" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                                  </linearGradient>
                                </defs>
                                <polyline
                                  fill="none"
                                  stroke="url(#authorSparkline)"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  points={sparklinePoints}
                                />
                              </svg>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {analytics.trend.map((point, index) => (
                                <div key={`${point.label}-${index}`} className="flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  {point.label}: {point.views.toLocaleString()} views
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-sm">Publish a few more posts to unlock trend insights.</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-gray-100 dark:border-gray-700 dark:bg-gray-800 shadow-lg">
                      <CardHeader>
                        <CardTitle className="dark:text-white">Snapshot</CardTitle>
                        <CardDescription className="dark:text-gray-400">Key metrics at a glance</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-4">
                          {overviewMetrics.map(metric => (
                            <div key={metric.label} className="flex items-start gap-3 rounded-2xl border border-gray-100 dark:border-gray-700 dark:bg-gray-700/50 p-3">
                              <div className={`rounded-xl bg-gray-50 dark:bg-gray-600 p-2 ${metric.accent}`}>
                                <metric.icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{metric.label}</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{metric.value}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{metric.helper}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-3 mt-6">
                    <Card className="border-gray-100 dark:border-gray-700 dark:bg-gray-800 shadow-lg">
                      <CardHeader>
                        <CardTitle className="dark:text-white">Top performing posts</CardTitle>
                        <CardDescription className="dark:text-gray-400">Based on views, likes, and comments</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {analytics.topPosts.length ? (
                          analytics.topPosts.map((post, index) => (
                            <div key={post.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 dark:text-gray-400">#{index + 1}</p>
                                <Link
                                  href={`/blog/${author.name.replace(/\s+/g, '-').toLowerCase()}/${post.slug}`}
                                  className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 hover:text-emerald-600 dark:hover:text-emerald-400"
                                >
                                  {post.title}
                                </Link>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {new Date(post.publishedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="text-right text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <p>{(post.viewCount || 0).toLocaleString()} views</p>
                                <p>{post._count?.likedBy || 0} likes</p>
                                <p>{post._count?.comments || 0} comments</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No data yet. Publish a story to populate this section.</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-gray-100 dark:border-gray-700 dark:bg-gray-800 shadow-lg lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="dark:text-white">Audience favourites</CardTitle>
                        <CardDescription className="dark:text-gray-400">Top categories attracting readers</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {analytics.categoryBreakdown.length ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analytics.categoryBreakdown.map(category => (
                              <div key={category.category} className="border border-gray-100 dark:border-gray-700 dark:bg-gray-700/30 rounded-2xl p-4">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{BLOG_CATEGORIES[category.category as keyof typeof BLOG_CATEGORIES]?.name || category.category}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {category.count} {category.count === 1 ? 'post' : 'posts'} · {category.views.toLocaleString()} views
                                </p>
                                <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-600 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                                    style={{ width: `${Math.min(100, (category.views / (analytics.totals.views || 1)) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Start publishing to learn which topics resonate most.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </section>
              )}
                <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                  {author.bio || 'Passionate poultry farmer and industry expert sharing knowledge and experiences.'}
                </p>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {author.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{author.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(author.createdAt)}</span>
                </div>
                {author.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${author.email}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      Contact
                    </a>
                  </div>
                )}
                {author.website && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <a href={author.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      Website
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <BookOpen className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {author._count.blogPosts || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {author._count.blogPosts === 1 ? 'Article' : 'Articles'}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {author._count.followers || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {author._count.followers === 1 ? 'Follower' : 'Followers'}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <Eye className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {author.blogPosts?.reduce((total, post) => total + (post.viewCount || 0), 0) || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Views</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <Heart className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {author.blogPosts?.reduce((total, post) => total + (post._count?.likedBy || 0), 0) || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Likes</div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
              {/* Owner-specific controls */}
              {currentUser && currentUser.id === author.id ? (
                <>
                  <Button
                    asChild
                    className="px-6 py-3 text-base font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Link href="/author/dashboard">
                      <LayoutDashboard className="h-5 w-5 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="px-6 py-3 text-base font-medium bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Link href="/author/profile/edit">
                      <Settings className="h-5 w-5 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="px-6 py-3 text-base font-medium bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Link href="/my-blogs">
                      <FileText className="h-5 w-5 mr-2" />
                      Manage Posts
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="px-6 py-3 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Link href="/author/posts/new">
                      <PenTool className="h-5 w-5 mr-2" />
                      New Post
                    </Link>
                  </Button>
                </>
              ) : (
                currentUser && (
                  <FollowButton
                    userId={author.id}
                    initialFollowing={isFollowing}
                    onFollowChange={setIsFollowing}
                    className="px-8 py-3 text-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  />
                )
              )}
              
              <Button
                variant="outline"
                onClick={() => router.push('/blog')}
                className="px-8 py-3 text-lg font-medium bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Blog
              </Button>
              
              {/* Social Links */}
              <div className="flex items-center space-x-2">
                {author.website && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={author.website} target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {author.twitter && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`https://twitter.com/${author.twitter}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {author.linkedin && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={author.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border border-gray-200 dark:border-gray-700 rounded-2xl p-1">
              <TabsTrigger 
                value="posts" 
                className="flex items-center gap-2 rounded-xl transition-all duration-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 dark:text-gray-300"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Posts</span>
                <Badge 
                  variant={activeTab === 'posts' ? 'outline' : 'secondary'} 
                  className={`ml-1 ${activeTab === 'posts' ? 'bg-white/20 text-white border-white/30' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'}`}
                >
                  {author._count.blogPosts}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="followers" 
                className="flex items-center gap-2 rounded-xl transition-all duration-300 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:text-gray-300"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Followers</span>
                <Badge 
                  variant={activeTab === 'followers' ? 'outline' : 'secondary'} 
                  className={`ml-1 ${activeTab === 'followers' ? 'bg-white/20 text-white border-white/30' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'}`}
                >
                  {author._count.followers}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="following" 
                className="flex items-center gap-2 rounded-xl transition-all duration-300 data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 dark:text-gray-300"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Following</span>
                <Badge 
                  variant={activeTab === 'following' ? 'outline' : 'secondary'} 
                  className={`ml-1 ${activeTab === 'following' ? 'bg-white/20 text-white border-white/30' : 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300'}`}
                >
                  {author._count.following}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-8">
            {/* Controls */}
            {author.blogPosts && author.blogPosts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {BLOG_CATEGORIES[category as keyof typeof BLOG_CATEGORIES]?.name || category}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="latest">Latest</option>
                      <option value="popular">Most Popular</option>
                      <option value="oldest">Oldest</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="dark:text-gray-300"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="dark:text-gray-300"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Posts Grid/List */}
            {filteredPosts.length > 0 ? (
              <>
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {paginatedPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-lg overflow-hidden bg-white dark:bg-gray-800">
                      {post.featuredImage && (
                        <div className="relative h-48 overflow-hidden">
                          <Image
                            src={post.featuredImage}
                            alt={post.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          {/* Category Badge */}
                          <div className="absolute top-3 left-3">
                            <Badge className={`${BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800'} font-medium`}>
                              {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name}
                            </Badge>
                          </div>

                          {post.featured && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <CardContent className="p-6 space-y-4">
                        {!post.featuredImage && (
                          <div className="flex items-center justify-between">
                            <Badge className={`${BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'} font-medium`}>
                              {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name}
                            </Badge>
                            {post.featured && (
                              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                        )}

                        <Link href={`/blog/${author.name.replace(/\s+/g, '-').toLowerCase()}/${post.slug}`}>
                          <h3 className="font-bold text-xl text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 cursor-pointer">
                            {post.title}
                          </h3>
                        </Link>

                        {post.excerpt && (
                          <MarkdownExcerpt
                            content={post.excerpt}
                            clampLines={3}
                            className="text-gray-600 dark:text-gray-400"
                          />
                        )}

                        {/* Tags */}
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-700 dark:text-gray-400 dark:border-gray-600 transition-colors cursor-pointer"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {post.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs dark:text-gray-400 dark:border-gray-600">
                                +{post.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Post Meta */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(post.publishedAt)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{getReadingTime(post.readingTime)}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{post.viewCount}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="h-3 w-3" />
                              <span>{post._count.likedBy}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MessageCircle className="h-3 w-3" />
                              <span>{post._count.comments}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        // Show first page, last page, current page, and pages around current
                        const showPage = page === 1 || 
                                        page === totalPages || 
                                        (page >= currentPage - 1 && page <= currentPage + 1);
                        const showEllipsis = (page === 2 && currentPage > 3) || 
                                            (page === totalPages - 1 && currentPage < totalPages - 2);
                        
                        if (showEllipsis && !showPage) {
                          return <span key={page} className="px-2 text-gray-400 dark:text-gray-500">...</span>;
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
                              : "dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"}
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
                      className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Results info */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Showing {startIndex + 1}-{Math.min(startIndex + postsPerPage, filteredPosts.length)} of {filteredPosts.length} posts
                </p>
              </>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No posts found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {filterCategory !== 'all' || sortBy !== 'latest' 
                    ? "Try adjusting your filters or search criteria."
                    : "This author hasn't published any posts yet."
                  }
                </p>
              </div>
            )}
          </TabsContent>

          {/* Followers Tab */}
          <TabsContent value="followers" className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4 shadow-lg"
                >
                  <Users className="h-10 w-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {author._count.followers} {author._count.followers === 1 ? 'Follower' : 'Followers'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  People who follow {author.name} to stay updated with their latest articles and insights
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full mb-3">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1">
                        {author._count.followers}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">Total Followers</div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 rounded-full mb-3">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-100 mb-1">
                        {Math.round((author._count.followers / Math.max(author._count.blogPosts, 1)) * 10) / 10}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">Avg per Post</div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500 rounded-full mb-3">
                        <Heart className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-1">
                        {author._count.followers > 0 ? 'High' : 'Growing'}
                      </div>
                      <div className="text-sm text-purple-700 dark:text-purple-300">Engagement</div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Feature Coming Soon */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 max-w-2xl mx-auto text-center border border-gray-200 dark:border-gray-600"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full mb-4">
                  <Users className="h-8 w-8 text-gray-600 dark:text-gray-300" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Follower Directory</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  We&apos;re working on a feature to showcase {author.name}&apos;s community of followers. 
                  This will include detailed follower profiles and engagement metrics.
                </p>
                <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-4 py-2">Coming Soon</Badge>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full mb-4 shadow-lg"
                >
                  <UserPlus className="h-10 w-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Following {author._count.following} {author._count.following === 1 ? 'Person' : 'People'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Authors and experts that {author.name} follows for inspiration and industry insights
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-full mb-3">
                        <UserPlus className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                        {author._count.following}
                      </div>
                      <div className="text-sm text-emerald-700 dark:text-emerald-300">Following</div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-full mb-3">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-orange-900 dark:text-orange-100 mb-1">
                        {author._count.following > 0 ? Math.round(author._count.following / Math.max(author._count.blogPosts, 1) * 100) / 100 : 0}
                      </div>
                      <div className="text-sm text-orange-700 dark:text-orange-300">Follow Ratio</div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-full mb-3">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mb-1">
                        {author._count.following > 0 ? 'Active' : 'Selective'}
                      </div>
                      <div className="text-sm text-indigo-700 dark:text-indigo-300">Network Style</div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Feature Coming Soon */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 max-w-2xl mx-auto text-center border border-gray-200 dark:border-gray-600"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full mb-4">
                  <UserPlus className="h-8 w-8 text-gray-600 dark:text-gray-300" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Following Network</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Soon you&apos;ll be able to explore who {author.name} follows, discover new authors, 
                  and build your own network within the poultry farming community.
                </p>
                <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-4 py-2">Coming Soon</Badge>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}