'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PublicNavbar from '@/components/layout/public-navbar';
import { 
  Search, 
  Calendar,
  Clock,
  User,
  Eye,
  MessageCircle,
  ArrowRight,
  Filter,
  Tag,
  BookOpen,
  TrendingUp,
  Star,
  Heart
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
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  _count: {
    comments: number;
    likedBy: number;
  };
}

interface Category {
  key?: string;
  name: string;
  slug: string;
  count: number;
  description?: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  count: number;
  color?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const BLOG_CATEGORIES = {
  FARMING_TIPS: { name: 'Farming Tips', icon: '🌱', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  POULTRY_HEALTH: { name: 'Poultry Health', icon: '🏥', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  FEED_NUTRITION: { name: 'Feed & Nutrition', icon: '🌾', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  EQUIPMENT_GUIDES: { name: 'Equipment Guides', icon: '🔧', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  MARKET_TRENDS: { name: 'Market Trends', icon: '📈', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  SUCCESS_STORIES: { name: 'Success Stories', icon: '🏆', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  INDUSTRY_NEWS: { name: 'Industry News', icon: '📰', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  SEASONAL_ADVICE: { name: 'Seasonal Advice', icon: '🌤️', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300' },
  BEGINNER_GUIDES: { name: 'Beginner Guides', icon: '📚', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300' },
  ADVANCED_TECHNIQUES: { name: 'Advanced Techniques', icon: '🎯', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300' }
};

export default function BlogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams?.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams?.get('category') || 'all');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams?.get('page') || '1'));

  // Fetch blog posts
  const fetchPosts = async (page = 1, search = '', category = 'all') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '9',
        ...(search && { search }),
        ...(category !== 'all' && { category })
      });

      const response = await fetch(`/api/blog/posts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch posts');

      const data = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch featured posts
  const fetchFeaturedPosts = async () => {
    try {
      const response = await fetch('/api/blog/posts?featured=true&limit=3');
      if (!response.ok) throw new Error('Failed to fetch featured posts');

      const data = await response.json();
      setFeaturedPosts(data.posts);
    } catch (error) {
      console.error('Error fetching featured posts:', error);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/blog/categories?withCounts=true');
      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch popular tags
  const fetchPopularTags = async () => {
    try {
      const response = await fetch('/api/blog/tags?limit=10');
      if (!response.ok) throw new Error('Failed to fetch tags');

      const data = await response.json();
      setPopularTags(data.tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchFeaturedPosts();
    fetchCategories();
    fetchPopularTags();
  }, []);

  // Fetch posts when filters change
  useEffect(() => {
    fetchPosts(currentPage, searchTerm, categoryFilter);
  }, [currentPage, searchTerm, categoryFilter]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const newUrl = `/blog${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [searchTerm, categoryFilter, currentPage, router]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 sm:py-16 lg:py-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(0,0,0,0.8),rgba(0,0,0,0.3))] opacity-30"></div>
        
        <div className="relative container mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 max-w-7xl">
          <div className="text-center max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4 sm:space-y-6 lg:space-y-8"
            >
              <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-600 dark:from-emerald-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent leading-tight px-4">
                  Poultry Knowledge Hub
                </h1>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed px-4">
                  Discover expert insights, farming tips, and industry trends to grow your poultry business successfully.
                </p>
              </div>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto px-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search articles, tips, and guides..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 sm:pl-12 pr-4 py-2 sm:py-3 lg:py-4 text-sm sm:text-base w-full rounded-xl sm:rounded-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg focus:shadow-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 dark:text-white dark:placeholder:text-gray-400 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-2xl mx-auto px-4">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center border border-white/20 dark:border-slate-700/50 shadow-sm">
                  <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{pagination.totalPosts}</div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Articles</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/20 dark:border-slate-700/50 shadow-sm">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-400">{categories.length}</div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Categories</div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/20 dark:border-slate-700/50 shadow-sm col-span-2 sm:col-span-1">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{popularTags.length}</div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Topics</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-slate-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4"
            >
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">Featured Articles</h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Hand-picked content from our experts</p>
              </div>
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 text-sm font-medium">
                <Star className="h-4 w-4 mr-1" />
                Featured
              </Badge>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            >
              {featuredPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                >
                  <Link href={`/blog/${post.author.name.replace(/\s+/g, '-').toLowerCase()}/${post.slug}`}>
                    <Card className="h-full hover:shadow-2xl transition-all duration-300 group cursor-pointer border-0 bg-white dark:bg-slate-800/50 dark:border dark:border-slate-700/50 overflow-hidden">
                      <div className="relative h-48 sm:h-52 lg:h-48 xl:h-52 overflow-hidden">
                        {post.featuredImage ? (
                          <Image
                            src={post.featuredImage}
                            alt={post.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-emerald-900/30 dark:to-blue-900/30 flex items-center justify-center">
                            <BookOpen className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <Badge className="absolute top-3 right-3 bg-yellow-500 text-white text-xs">
                          Featured
                        </Badge>
                      </div>
                      
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3 sm:space-y-4">
                          {/* Category Badge */}
                          <Badge 
                            className={`text-xs font-medium ${BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}
                          >
                            {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name}
                          </Badge>
                          
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">
                            {post.title}
                          </h3>
                          
                          {post.excerpt && (
                            <MarkdownExcerpt
                              content={post.excerpt}
                              clampLines={2}
                              className="text-sm sm:text-base text-gray-600 dark:text-gray-400"
                            />
                          )}
                          
                          {/* Author and Stats */}
                          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100 dark:border-slate-700">
                            <div className="flex items-center space-x-2">
                              {post.author.avatar ? (
                                <Image
                                  src={post.author.avatar}
                                  alt={post.author.name}
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
                                  <User className="h-3 w-3 text-white" />
                                </div>
                              )}
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{post.author.name}</span>
                            </div>
                            
                            <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Eye className="h-3 w-3" />
                                <span>{post.viewCount}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{post.readingTime || 3} min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-4 sm:py-8 lg:py-12 xl:py-16">
        <div className="container mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="lg:sticky lg:top-6 space-y-3 sm:space-y-4 lg:space-y-6">
                {/* Categories Filter */}
                <Card className="border-0 shadow-md lg:shadow-lg bg-white dark:bg-slate-800/50 dark:border dark:border-slate-700/50">
                  <CardHeader className="pb-2 sm:pb-3 lg:pb-4 px-3 sm:px-4 lg:px-6">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white">
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-emerald-600 dark:text-emerald-400" />
                      Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                    <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="w-full h-10 sm:h-11 text-xs sm:text-sm lg:text-base">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.slug || category.key || category.name} value={category.slug || category.key || category.name}>
                            {category.name} ({category.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Popular Tags */}
                {popularTags.length > 0 && (
                  <Card className="border-0 shadow-lg bg-white dark:bg-slate-800/50 dark:border dark:border-slate-700/50">
                    <CardHeader className="pb-3 sm:pb-4">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                        Popular Topics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {popularTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="cursor-pointer hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 dark:bg-slate-700 dark:text-slate-300 transition-colors text-xs px-2 py-1 touch-manipulation"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Stats */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 dark:border dark:border-slate-700/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                      <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      Blog Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Articles</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{pagination.totalPosts}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Categories</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{categories.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Active Topics</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{popularTags.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              {loading ? (
                <div className="space-y-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse border-0 shadow-lg dark:bg-slate-800/50">
                      <div className="h-48 bg-gray-200 dark:bg-slate-700 rounded-t-lg"></div>
                      <CardContent className="p-6 space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {categoryFilter === 'all' ? 'All Articles' : categories.find(c => c.slug === categoryFilter)?.name}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {pagination.totalPosts} article{pagination.totalPosts !== 1 ? 's' : ''} found
                      </p>
                    </div>
                  </div>

                  {/* Posts Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                    {posts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.05 * index }}
                        className="w-full"
                      >
                        <Link href={`/blog/${post.author.name.replace(/\s+/g, '-').toLowerCase()}/${post.slug}`} className="block w-full">
                          <Card className="h-full hover:shadow-2xl transition-all duration-300 group cursor-pointer border-0 bg-white dark:bg-slate-800/50 dark:border dark:border-slate-700/50 overflow-hidden touch-manipulation">
                            <div className="flex flex-col sm:flex-row h-full">
                              {/* Image */}
                              <div className="relative w-full sm:w-48 h-48 sm:h-auto overflow-hidden">
                                {post.featuredImage ? (
                                  <Image
                                    src={post.featuredImage}
                                    alt={post.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-emerald-900/30 dark:to-blue-900/30 flex items-center justify-center">
                                    <BookOpen className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between min-h-[200px] sm:min-h-0">
                                <div className="space-y-3">
                                  {/* Category & Date */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge 
                                      className={`text-xs font-medium px-2 py-1 ${BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}
                                    >
                                      {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name}
                                    </Badge>
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {formatDate(post.publishedAt)}
                                    </div>
                                  </div>

                                  {/* Title */}
                                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200 leading-tight">
                                    {post.title}
                                  </h3>

                                  {/* Excerpt */}
                                  {post.excerpt && (
                                    <MarkdownExcerpt
                                      content={post.excerpt}
                                      clampLines={2}
                                      className="text-sm sm:text-base text-gray-600 dark:text-gray-400"
                                    />
                                  )}
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-slate-700">
                                  <div className="flex items-center space-x-2">
                                    {post.author.avatar ? (
                                      <Image
                                        src={post.author.avatar}
                                        alt={post.author.name}
                                        width={28}
                                        height={28}
                                        className="rounded-full"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
                                        <User className="h-3 w-3 text-white" />
                                      </div>
                                    )}
                                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{post.author.name}</span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-500">
                                    <div className="flex items-center space-x-1">
                                      <Eye className="h-3 w-3" />
                                      <span>{post.viewCount}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <MessageCircle className="h-3 w-3" />
                                      <span>{post._count?.comments || 0}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Heart className="h-3 w-3" />
                                      <span>{post._count?.likedBy || 0}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{post.readingTime || 3} min</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="mt-8 sm:mt-12 flex flex-col items-center gap-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Showing page {pagination.currentPage} of {pagination.totalPages}
                      </div>
                      
                      <div className="flex items-center justify-center space-x-2 w-full max-w-sm">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={!pagination.hasPrevPage}
                          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-3 touch-manipulation dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 rotate-180" />
                          <span className="hidden sm:inline">Previous</span>
                          <span className="sm:hidden">Prev</span>
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(3, pagination.totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === pagination.currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="w-9 h-9 sm:w-10 sm:h-10 p-0 text-xs sm:text-sm touch-manipulation"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                          {pagination.totalPages > 3 && (
                            <>
                              <span className="text-gray-400 px-1">...</span>
                              <Button
                                variant={pagination.totalPages === pagination.currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pagination.totalPages)}
                                className="w-9 h-9 sm:w-10 sm:h-10 p-0 text-xs sm:text-sm touch-manipulation"
                              >
                                {pagination.totalPages}
                              </Button>
                            </>
                          )}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={!pagination.hasNextPage}
                          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-3 touch-manipulation"
                        >
                          <span className="sm:hidden">Next</span>
                          <span className="hidden sm:inline">Next</span>
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No articles found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {searchTerm ? 
                      `No articles match your search for "${searchTerm}"` : 
                      'No articles available in this category'
                    }
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('all');
                    }}
                    className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    View All Articles
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}