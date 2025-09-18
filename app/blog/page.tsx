'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateBlogBreadcrumbData, generateBlogWebsiteData } from '@/components/blog/blog-seo';
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
  Star
} from 'lucide-react';
import { toast } from 'sonner';

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
    slug: string;
  }>;
  commentCount: number;
}

interface Category {
  key: string;
  name: string;
  icon: string;
  color: string;
  postCount: number;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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

export default function BlogPage() {
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

  // Generate structured data for the blog listing page
  const blogStructuredData = generateBlogWebsiteData();
  const breadcrumbData = generateBlogBreadcrumbData();
  
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
        status: 'PUBLISHED',
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
      const response = await fetch('/api/blog/posts?featured=true&limit=3&status=PUBLISHED');
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
      const response = await fetch('/api/blog/tags?withCounts=true&limit=10');
      if (!response.ok) throw new Error('Failed to fetch tags');

      const data = await response.json();
      setPopularTags(data.tags.filter((tag: Tag) => tag.postCount > 0));
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  useEffect(() => {
    fetchPosts(currentPage, searchTerm, categoryFilter);
    fetchFeaturedPosts();
    fetchCategories();
    fetchPopularTags();
  }, [currentPage, searchTerm, categoryFilter]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.push(`/blog${newUrl}`, { scroll: false });
  }, [searchTerm, categoryFilter, currentPage, router]);

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

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blogStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        />
      </Head>
      
      <PublicNavbar />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <motion.h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
              Poultry Market KE Blog
            </motion.h1>
            <motion.p 
              className="text-xl sm:text-2xl text-emerald-100 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Your go-to resource for poultry farming tips, industry insights, and success stories from Kenya&apos;s leading poultry marketplace.
            </motion.p>
            
            {/* Search Bar */}
            <motion.div 
              className="max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search articles, tips, and guides..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-4 text-lg bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-white/70 focus:bg-white/20"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Articles</h2>
            <p className="text-lg text-gray-600">Handpicked content to help you succeed in poultry farming</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-0 bg-white">
                    <div className="relative overflow-hidden rounded-t-lg">
                      {post.featuredImage ? (
                        <Image
                          src={post.featuredImage}
                          alt={post.title}
                          width={400}
                          height={240}
                          className="w-full h-60 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-60 bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                          <BookOpen className="h-16 w-16 text-emerald-400" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-yellow-500 text-white font-semibold">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="mb-3">
                        <Badge className={BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800'}>
                          {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} 
                          {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name}
                        </Badge>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                        {post.title}
                      </h3>
                      
                      {post.excerpt && (
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{post.author.name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{getReadingTime(post.readingTime)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>{post.viewCount}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Categories</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={categoryFilter === 'all' ? 'default' : 'ghost'}
                  className={`w-full justify-start ${categoryFilter === 'all' ? 'bg-emerald-600' : ''}`}
                  onClick={() => setCategoryFilter('all')}
                >
                  All Articles ({pagination.totalPosts})
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.key}
                    variant={categoryFilter === category.key ? 'default' : 'ghost'}
                    className={`w-full justify-start text-left ${categoryFilter === category.key ? 'bg-emerald-600' : ''}`}
                    onClick={() => setCategoryFilter(category.key)}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.name} ({category.postCount})
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Popular Tags */}
            {popularTags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Tag className="h-5 w-5" />
                    <span>Popular Tags</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-emerald-50 hover:border-emerald-300"
                        onClick={() => router.push(`/blog?tag=${tag.slug}`)}
                      >
                        {tag.name} ({tag.postCount})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Newsletter Signup */}
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
          </div>

          {/* Posts Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {categoryFilter === 'all' ? 'All Articles' : 
                 BLOG_CATEGORIES[categoryFilter as keyof typeof BLOG_CATEGORIES]?.name || 'Articles'}
              </h2>
              
              {/* Mobile Filters */}
              <div className="lg:hidden">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.key} value={category.key}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="w-full h-48 bg-gray-200 rounded-t-lg"></div>
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || categoryFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Check back soon for new content.'
                  }
                </p>
                {(searchTerm || categoryFilter !== 'all') && (
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('all');
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                    >
                      <Link href={`/blog/${post.slug}`}>
                        <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer">
                          <div className="relative overflow-hidden rounded-t-lg">
                            {post.featuredImage ? (
                              <Image
                                src={post.featuredImage}
                                alt={post.title}
                                width={400}
                                height={240}
                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <BookOpen className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <CardContent className="p-6">
                            <div className="mb-3">
                              <Badge className={BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800'}>
                                {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} 
                                {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name}
                              </Badge>
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                              {post.title}
                            </h3>
                            
                            {post.excerpt && (
                              <p className="text-gray-600 mb-4 line-clamp-3 text-sm">
                                {post.excerpt}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                              <div className="flex items-center space-x-2">
                                <User className="h-3 w-3" />
                                <span>{post.author.name}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(post.publishedAt)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{getReadingTime(post.readingTime)}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Eye className="h-3 w-3" />
                                  <span>{post.viewCount}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MessageCircle className="h-3 w-3" />
                                  <span>{post.commentCount}</span>
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                    >
                      Previous
                    </Button>
                    
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {pagination.totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}