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
    color?: string;
  }>;
  _count: {
    comments: number;
    likes: number;
  };
}

interface Category {
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
  FARMING_TIPS: { name: 'Farming Tips', icon: '🌱', color: 'bg-green-100 text-green-800' },
  POULTRY_HEALTH: { name: 'Poultry Health', icon: '🏥', color: 'bg-red-100 text-red-800' },
  FEED_NUTRITION: { name: 'Feed & Nutrition', icon: '🌾', color: 'bg-yellow-100 text-yellow-800' },
  EQUIPMENT_GUIDES: { name: 'Equipment Guides', icon: '🔧', color: 'bg-blue-100 text-blue-800' },
  MARKET_TRENDS: { name: 'Market Trends', icon: '📈', color: 'bg-indigo-100 text-indigo-800' },
  SUCCESS_STORIES: { name: 'Success Stories', icon: '🏆', color: 'bg-orange-100 text-orange-800' },
  INDUSTRY_NEWS: { name: 'Industry News', icon: '📰', color: 'bg-purple-100 text-purple-800' },
  SEASONAL_ADVICE: { name: 'Seasonal Advice', icon: '🌤️', color: 'bg-cyan-100 text-cyan-800' },
  BEGINNER_GUIDES: { name: 'Beginner Guides', icon: '📚', color: 'bg-lime-100 text-lime-800' },
  ADVANCED_TECHNIQUES: { name: 'Advanced Techniques', icon: '🎯', color: 'bg-pink-100 text-pink-800' }
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
      const response = await fetch('/api/blog/categories');
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
      <section className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold text-gray-900 mb-6"
            >
              Poultry Knowledge Hub
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
            >
              Discover expert insights, farming tips, and industry trends to grow your poultry business successfully.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative max-w-md mx-auto"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-12 pr-4 py-3 w-full rounded-full border-0 bg-white shadow-lg focus:shadow-xl transition-shadow"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Featured Articles</h2>
              <Badge className="bg-yellow-500 text-white">
                <Star className="h-4 w-4 mr-1" />
                Featured
              </Badge>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="grid md:grid-cols-3 gap-8"
            >
              {featuredPosts.map((post, index) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-0 bg-white">
                    <div className="relative h-48 overflow-hidden rounded-t-lg">
                      {post.featuredImage ? (
                        <Image
                          src={post.featuredImage}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                          <BookOpen className="h-16 w-16 text-emerald-400" />
                        </div>
                      )}
                      
                      {post.featured && (
                        <Badge className="bg-yellow-500 text-white font-semibold">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800'}>
                          {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name || post.category}
                        </Badge>
                      </div>
                      
                      <h3 className="font-bold text-xl mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      
                      {post.excerpt && (
                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{post.author.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {post.readingTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{post.readingTime} min</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{post.viewCount}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                {/* Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.slug} value={category.slug}>
                            {category.name} ({category.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Popular Tags */}
                {popularTags.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Popular Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {popularTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="cursor-pointer hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                            onClick={() => handleSearch(tag.name)}
                          >
                            {tag.name} ({tag.count})
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Blog Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Articles</span>
                        <span className="font-semibold">{pagination.totalPosts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Categories</span>
                        <span className="font-semibold">{categories.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Authors</span>
                        <span className="font-semibold">
                          {posts.reduce((acc, post) => {
                            const authorIds = acc.filter(id => id === post.author.id);
                            return authorIds.length === 0 ? [...acc, post.author.id] : acc;
                          }, [] as string[]).length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  {searchTerm ? `Search results for "${searchTerm}"` : 
                   categoryFilter !== 'all' ? 
                   `${categories.find(c => c.slug === categoryFilter)?.name || categoryFilter} Articles` : 
                   'Latest Articles'}
                </h2>
                <div className="text-sm text-gray-500">
                  {pagination.totalPosts} article{pagination.totalPosts !== 1 ? 's' : ''} found
                </div>
              </div>

              {loading ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-3"></div>
                        <div className="h-6 bg-gray-200 rounded mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded mb-4"></div>
                        <div className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : posts.length > 0 ? (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
                  >
                    {posts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                      >
                        <Link href={`/blog/${post.slug}`}>
                          <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer">
                            <div className="relative h-48 overflow-hidden rounded-t-lg">
                              {post.featuredImage ? (
                                <Image
                                  src={post.featuredImage}
                                  alt={post.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                  <BookOpen className="h-12 w-12 text-white" />
                                </div>
                              )}
                              
                              {post.featured && (
                                <Badge className="absolute top-3 left-3 bg-yellow-500 text-white">
                                  <Star className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            
                            <CardContent className="p-6">
                              <div className="flex items-center gap-2 mb-3">
                                <Badge className={BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800'}>
                                  {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name || post.category}
                                </Badge>
                              </div>
                              
                              <h3 className="font-bold text-lg mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">
                                {post.title}
                              </h3>
                              
                              {post.excerpt && (
                                <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                                  {post.excerpt}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{post.author.name}</span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  {post.readingTime && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      <span>{post.readingTime} min</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Eye className="h-4 w-4" />
                                    <span>{post.viewCount}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(post.publishedAt)}</span>
                                </div>
                                
                                {post._count.comments > 0 && (
                                  <div className="flex items-center gap-1">
                                    <MessageCircle className="h-4 w-4" />
                                    <span>{post._count.comments} comments</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-12">
                      <Button
                        variant="outline"
                        disabled={!pagination.hasPrevPage}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="px-4 py-2"
                      >
                        Previous
                      </Button>
                      
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(
                            pagination.totalPages - 4,
                            Math.max(1, currentPage - 2)
                          )) + i;
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              onClick={() => handlePageChange(pageNum)}
                              className="px-3 py-2 min-w-[40px]"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        disabled={!pagination.hasNextPage}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="px-4 py-2"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || categoryFilter !== 'all' 
                      ? "Try adjusting your search or filter criteria." 
                      : "Be the first to share your poultry knowledge!"}
                  </p>
                  {(searchTerm || categoryFilter !== 'all') && (
                    <Button 
                      onClick={() => {
                        setSearchTerm('');
                        setCategoryFilter('all');
                        setCurrentPage(1);
                      }}
                      variant="outline"
                    >
                      Clear Filters
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}