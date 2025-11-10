'use client';

import React from 'react';
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
  X,
  Users
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import MarkdownExcerpt from '@/components/blog/markdown-excerpt';

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
    _count?: { followers: number };
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
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedTag) params.set('tag', selectedTag);
      if (sortBy) params.set('sort', sortBy);
      
      const response = await fetch(`/api/blog/posts?${params}`);
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
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-2 sm:text-3xl lg:text-4xl">
              PoultryHub Blog
            </h1>
            <p className="text-emerald-100 text-sm mb-4 sm:mb-6 sm:text-base lg:text-lg">
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
      <div className="max-w-6xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        {/* Mobile Filters */}
        <div className="mb-4 lg:hidden">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full justify-between h-10"
            size="sm"
          >
            <span className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4" />
              Filters & Sort
            </span>
            {showFilters ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Sidebar - Mobile Collapsible */}
          <div className={`lg:block ${showFilters ? 'block' : 'hidden'} space-y-3 lg:space-y-4`}>
            {/* Sort */}
            <Card className="p-3 lg:p-4">
              <h3 className="font-semibold mb-2 lg:mb-3 text-sm">Sort By</h3>
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
                      if (isMobile) setShowFilters(false);
                    }}
                    className={`w-full text-left px-2 lg:px-3 py-1.5 lg:py-2 rounded text-xs transition-colors ${
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
                      key={category.key || category.slug || category.id}
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
              <div className="space-y-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden animate-pulse bg-white border-0 shadow-sm rounded-lg">
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-64 h-40 sm:h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex-shrink-0" />
                      <div className="p-5 flex-1 space-y-4">
                        <div className="space-y-3">
                          <div className="h-6 bg-gray-200 rounded-md w-4/5" />
                          <div className="h-4 bg-gray-200 rounded w-full" />
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                        </div>
                        <div className="flex space-x-2">
                          <div className="h-6 bg-gray-200 rounded-full w-16" />
                          <div className="h-6 bg-gray-200 rounded-full w-20" />
                        </div>
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full" />
                              <div className="space-y-1">
                                <div className="h-4 bg-gray-200 rounded w-24" />
                                <div className="h-3 bg-gray-200 rounded w-16" />
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <div className="h-4 bg-gray-200 rounded w-8" />
                              <div className="h-4 bg-gray-200 rounded w-8" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card className="p-8 text-center">
                <h3 className="font-semibold mb-2">No articles found</h3>
                <p className="text-gray-600 text-sm mb-4">Try different filters or check back later</p>
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
                    <div className="space-y-6">
                      {featuredPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 30, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ 
                            delay: index * 0.1,
                            duration: 0.5,
                            ease: "easeOut"
                          }}
                          whileHover={{ 
                            y: -8,
                            transition: { duration: 0.2 }
                          }}
                        >
                          <Card className="group overflow-hidden bg-white border-0 shadow-md hover:shadow-2xl transition-all duration-300 rounded-xl backdrop-blur-sm will-change-transform gpu-acceleration">
                            <div className="flex flex-col sm:flex-row relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-transparent to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                              <div className="relative w-full sm:w-72 lg:w-80 h-48 sm:h-52 lg:h-56 flex-shrink-0 overflow-hidden">
                                {post.featuredImage ? (
                                  <Image
                                    src={post.featuredImage}
                                    alt={post.title}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out will-change-transform"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-200 flex items-center justify-center relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <Tag className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 group-hover:scale-110 transition-transform duration-300 relative z-10" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {post.category && (
                                  <Badge className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-emerald-600/90 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md shadow-lg hover:bg-emerald-700 transition-colors">
                                    {post.category.name}
                                  </Badge>
                                )}
                                {post.publishedAt && (
                                  <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                                    {format(new Date(post.publishedAt), 'MMM d')}
                                  </div>
                                )}
                              </div>
                              <CardContent className="p-6 flex-1 flex flex-col justify-between">
                                <div className="space-y-4">
                                  <Link href={`/blog/${post.author.name.replace(/\s+/g, '-').toLowerCase()}/${post.slug}`} className="block group/link">
                                    <h3 className="font-bold mb-3 line-clamp-2 text-xl leading-tight hover:text-emerald-600 transition-colors duration-200 group-hover/link:text-emerald-700">
                                      {post.title}
                                    </h3>
                                    <MarkdownExcerpt
                                      content={post.excerpt}
                                      clampLines={3}
                                      className="text-gray-600 text-sm"
                                    />
                                  </Link>
                                </div>
                                
                                {/* Author Section - Well Styled */}
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="relative">
                                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
                                          {post.author.avatar ? (
                                            <Image
                                              src={post.author.avatar}
                                              alt={post.author.name}
                                              fill
                                              className="rounded-full object-cover"
                                            />
                                          ) : (
                                            post.author.name.charAt(0).toUpperCase()
                                          )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <Link href={`/blog/author/${post.author.id}`} className="group/author">
                                          <p className="font-semibold text-gray-900 text-sm group-hover/author:text-emerald-600 transition-colors truncate">
                                            {post.author.name}
                                          </p>
                                          <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {post.author._count?.followers || 0} followers
                                          </p>
                                        </Link>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                      <div className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
                                        <Heart className="h-4 w-4" />
                                        <span className="font-medium">{post._count.likes}</span>
                                      </div>
                                      <div className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
                                        <MessageCircle className="h-4 w-4" />
                                        <span className="font-medium">{post._count.comments}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </div>
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
                    <div className="space-y-4 lg:space-y-5">
                      {regularPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, x: -20, scale: 0.98 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          transition={{ 
                            delay: index * 0.05,
                            duration: 0.4,
                            ease: "easeOut"
                          }}
                          whileHover={{ 
                            y: -4,
                            transition: { duration: 0.2 }
                          }}
                        >
                          <Card className="group overflow-hidden bg-white border-0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-lg">
                            <div className="flex flex-col sm:flex-row">
                              <div className="relative w-full sm:w-48 lg:w-64 h-40 sm:h-44 lg:h-48 flex-shrink-0 overflow-hidden">
                                {post.featuredImage ? (
                                  <Image
                                    src={post.featuredImage}
                                    alt={post.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 flex items-center justify-center">
                                    <Tag className="h-6 w-6 text-gray-600 group-hover:scale-105 transition-transform duration-300" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {post.category && (
                                  <Badge className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md">
                                    {post.category.name}
                                  </Badge>
                                )}
                                {post.publishedAt && (
                                  <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                                    {format(new Date(post.publishedAt), 'MMM d')}
                                  </div>
                                )}
                              </div>
                              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                                <div className="space-y-3">
                                  <Link href={`/blog/${post.author.name.replace(/\s+/g, '-').toLowerCase()}/${post.slug}`} className="block group/link">
                                    <h3 className="font-bold mb-2 line-clamp-2 text-lg leading-tight hover:text-emerald-600 transition-colors duration-200 group-hover/link:text-emerald-700">
                                      {post.title}
                                    </h3>
                                    <MarkdownExcerpt
                                      content={post.excerpt}
                                      clampLines={2}
                                      className="text-gray-600 text-sm mb-3"
                                    />
                                  </Link>
                                  
                                  {/* Tags */}
                                  {post.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {post.tags.slice(0, 2).map((tag) => (
                                        <Badge
                                          key={tag.id}
                                          variant="secondary"
                                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 transition-colors cursor-pointer"
                                        >
                                          {tag.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Author Section - Compact but well styled */}
                                <div className="mt-4 pt-3 border-t border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2.5">
                                      <div className="relative">
                                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium text-xs shadow-sm">
                                          {post.author.avatar ? (
                                            <Image
                                              src={post.author.avatar}
                                              alt={post.author.name}
                                              fill
                                              className="rounded-full object-cover"
                                            />
                                          ) : (
                                            post.author.name.charAt(0).toUpperCase()
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <Link href={`/blog/author/${post.author.id}`} className="group/author">
                                          <p className="font-medium text-gray-900 text-sm group-hover/author:text-emerald-600 transition-colors truncate">
                                            {post.author.name}
                                          </p>
                                          <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {post.author._count?.followers || 0} followers
                                          </p>
                                        </Link>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                                      <div className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
                                        <Heart className="h-3.5 w-3.5" />
                                        <span className="font-medium">{post._count.likes}</span>
                                      </div>
                                      <div className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        <span className="font-medium">{post._count.comments}</span>
                                      </div>
                                      {post.readingTime && (
                                        <div className="flex items-center gap-1 text-gray-400">
                                          <Clock className="h-3.5 w-3.5" />
                                          <span>{post.readingTime}min</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </div>
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