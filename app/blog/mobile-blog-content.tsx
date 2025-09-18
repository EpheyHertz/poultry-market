'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Heart, 
  MessageCircle, 
  Tag,
  ChevronRight,
  TrendingUp,
  Clock,
  Eye,
  Menu,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  publishedAt: Date | null;
  author: {
    id: string;
    name: string;
    avatar?: string;
    _count: { followers: number };
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  _count: {
    likes: number;
    comments: number;
  };
  readingTime?: number;
  views?: number;
}

interface Category {
  id?: string;
  key: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  postCount: number;
  count: number;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  postCount?: number;
}

export default function MobileBlogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams?.get('tag') || '');
  const [sortBy, setSortBy] = useState(searchParams?.get('sort') || 'latest');
  const [showFilters, setShowFilters] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedTag) params.set('tag', selectedTag);
      if (sortBy) params.set('sort', sortBy);
      
      const response = await fetch(`/api/blog?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedTag, sortBy]);

  const fetchMetadata = useCallback(async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/blog/categories?withCounts=true'),
        fetch('/api/blog/tags?withCounts=true')
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData.tags || []);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchMetadata();
  }, [fetchPosts, fetchMetadata]);

  const updateURL = (key: string, value: string) => {
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/blog?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    updateURL('search', value);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedTag('');
    setSortBy('latest');
    router.push('/blog');
  };

  const featuredPosts = posts.slice(0, 3);
  const regularPosts = posts.slice(3);

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile-First Hero Section */}
      <section className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
        <div className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-2 sm:text-3xl lg:text-4xl">
              PoultryHub Blog
            </h1>
            <p className="text-emerald-100 text-sm mb-6 sm:text-base lg:text-lg">
              Expert insights for poultry professionals
            </p>
            
            {/* Mobile Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-white text-gray-900 border-0 h-10 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Mobile Filters */}
        <div className="mb-6 lg:hidden">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full justify-between h-10"
            size="sm"
          >
            <span className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4" />
              Filters
            </span>
            {showFilters ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Mobile Collapsible */}
          <div className={`lg:block ${showFilters ? 'block' : 'hidden'} space-y-4`}>
            {/* Sort */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Sort By</h3>
              <div className="space-y-1">
                {[
                  { value: 'latest', label: 'Latest' },
                  { value: 'popular', label: 'Popular' },
                  { value: 'trending', label: 'Trending' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      updateURL('sort', option.value);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                      sortBy === option.value
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Categories */}
            {categories.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3 text-sm">Categories</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      updateURL('category', '');
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                      !selectedCategory
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    All
                  </button>
                  {categories.slice(0, 8).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.slug);
                        updateURL('category', category.slug);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex justify-between ${
                        selectedCategory === category.slug
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className="truncate">{category.name}</span>
                      <span className="text-gray-400 ml-2">({category.postCount || 0})</span>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Clear Filters */}
            {(searchQuery || selectedCategory || selectedTag || sortBy !== 'latest') && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full h-8 text-xs"
                size="sm"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Posts Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden animate-pulse">
                    <div className="aspect-video bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded" />
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card className="p-8 text-center">
                <h3 className="font-semibold mb-2">No articles found</h3>
                <p className="text-gray-600 text-sm mb-4">Try different filters</p>
                <Button onClick={clearFilters} size="sm">
                  Clear Filters
                </Button>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Featured Posts */}
                {featuredPosts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <h2 className="text-lg font-bold">Featured</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {featuredPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="group overflow-hidden hover:shadow-lg transition-shadow h-full">
                            <div className="relative aspect-video">
                              {post.featuredImage ? (
                                <Image
                                  src={post.featuredImage}
                                  alt={post.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                                  <Tag className="h-6 w-6 text-emerald-600" />
                                </div>
                              )}
                              {post.category && (
                                <Badge className="absolute top-2 left-2 bg-emerald-600 text-white text-xs">
                                  {post.category.name}
                                </Badge>
                              )}
                            </div>
                            <CardContent className="p-4 flex-1 flex flex-col">
                              <Link href={`/blog/${post.slug}`}>
                                <h3 className="font-semibold mb-2 line-clamp-2 text-sm hover:text-emerald-600 transition-colors">
                                  {post.title}
                                </h3>
                                <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                                  {post.excerpt}
                                </p>
                              </Link>
                              
                              <div className="mt-auto space-y-2">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span className="truncate">{post.author.name}</span>
                                  </div>
                                  {post.publishedAt && (
                                    <span>{format(new Date(post.publishedAt), 'MMM d')}</span>
                                  )}
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Heart className="h-3 w-3" />
                                      <span>{post._count.likes}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MessageCircle className="h-3 w-3" />
                                      <span>{post._count.comments}</span>
                                    </div>
                                  </div>
                                  
                                  <Link href={`/blog/author/${post.author.id}`}>
                                    <Badge variant="outline" className="text-xs hover:bg-emerald-50">
                                      {post.author._count.followers} followers
                                    </Badge>
                                  </Link>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Posts */}
                {regularPosts.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold mb-4">Latest Articles</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {regularPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="group overflow-hidden hover:shadow-lg transition-shadow h-full">
                            <div className="relative aspect-video">
                              {post.featuredImage ? (
                                <Image
                                  src={post.featuredImage}
                                  alt={post.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                  <Tag className="h-6 w-6 text-gray-600" />
                                </div>
                              )}
                              {post.category && (
                                <Badge className="absolute top-2 left-2 bg-emerald-600 text-white text-xs">
                                  {post.category.name}
                                </Badge>
                              )}
                            </div>
                            <CardContent className="p-4 flex-1 flex flex-col">
                              <Link href={`/blog/${post.slug}`}>
                                <h3 className="font-semibold mb-2 line-clamp-2 text-sm hover:text-emerald-600 transition-colors">
                                  {post.title}
                                </h3>
                                <p className="text-gray-600 text-xs line-clamp-3 mb-3">
                                  {post.excerpt}
                                </p>
                              </Link>
                              
                              {/* Tags */}
                              {post.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {post.tags.slice(0, 2).map((tag) => (
                                    <Badge
                                      key={tag.id}
                                      variant="secondary"
                                      className="text-xs px-1.5 py-0.5"
                                    >
                                      {tag.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              <div className="mt-auto space-y-2">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span className="truncate">{post.author.name}</span>
                                  </div>
                                  {post.publishedAt && (
                                    <span>{format(new Date(post.publishedAt), 'MMM d')}</span>
                                  )}
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Heart className="h-3 w-3" />
                                      <span>{post._count.likes}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MessageCircle className="h-3 w-3" />
                                      <span>{post._count.comments}</span>
                                    </div>
                                    {post.readingTime && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{post.readingTime}min</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <Link href={`/blog/author/${post.author.id}`}>
                                    <Badge variant="outline" className="text-xs hover:bg-emerald-50">
                                      {post.author._count.followers} followers
                                    </Badge>
                                  </Link>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}