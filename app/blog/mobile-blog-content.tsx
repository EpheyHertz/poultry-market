'use client';

import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  Users,
  Loader2,
  ArrowRight,
  BookOpen,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  BadgeCheck
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
  authorUsername?: string | null;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  authorIsVerified?: boolean;
  author: {
    id: string;
    name: string;
    displayName?: string | null;
    username?: string | null;
    avatar?: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
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

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [navigating, setNavigating] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams?.get('search') || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);

  // Track scroll position for back to top/bottom button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show button after scrolling 300px
      setShowScrollButton(scrollTop > 300);
      
      // Check if near bottom (within 500px of bottom)
      setIsNearBottom(scrollTop + windowHeight >= documentHeight - 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchPosts = useCallback(async (page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '10');
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedTag) params.set('tag', selectedTag);
      if (sortBy) params.set('sort', sortBy);
      
      const response = await fetch(`/api/blog/posts?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setPosts(prev => [...prev, ...(data.posts || [])]);
        } else {
          setPosts(data.posts || []);
        }
        setPagination(data.pagination || null);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedCategory, selectedTag, sortBy]);

  const loadMorePosts = () => {
    if (pagination?.hasNextPage && !loadingMore) {
      fetchPosts(currentPage + 1, true);
    }
  };

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
    fetchPosts(1, false);
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
    // Reset to page 1 when filters change
    setCurrentPage(1);
    router.push(`/blog?${params.toString()}`);
  };

  // Debounced search - waits 500ms after user stops typing
  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
      updateURL('search', value);
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle navigation to blog post with loading state
  const handlePostClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    setNavigating(true);
    router.push(url);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setSelectedCategory('');
    setSelectedTag('');
    setSortBy('latest');
    setCurrentPage(1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    router.push('/blog');
  };

  const featuredPosts = posts.slice(0, 3);
  const regularPosts = posts.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      {/* Mobile-First Hero Section with Premium Gradient */}
      <section className="hero-gradient relative overflow-hidden text-white">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl float-animation" />
          <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '3s' }} />
        </div>
        
        <div className="relative px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl font-bold mb-3 sm:text-4xl lg:text-5xl tracking-tight text-glow"
            >
              PoultryHub Blog
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-emerald-100 text-sm mb-6 sm:mb-8 sm:text-base lg:text-lg"
            >
              Expert insights for poultry professionals
            </motion.p>
            
            {/* Premium Search Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative max-w-lg mx-auto"
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-300 via-white/50 to-emerald-300 rounded-2xl opacity-40 group-hover:opacity-60 blur transition-opacity duration-300" />
                <div className="relative flex items-center">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search articles, topics, authors..."
                    value={searchInput}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    className="pl-12 pr-12 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border-0 h-12 sm:h-14 text-sm sm:text-base rounded-xl shadow-2xl focus:ring-2 focus:ring-emerald-400/50"
                  />
                  {searchInput !== searchQuery && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 60L60 55C120 50 240 40 360 35C480 30 600 30 720 35C840 40 960 50 1080 52.5C1200 55 1320 50 1380 47.5L1440 45V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" className="fill-slate-50 dark:fill-slate-950" />
          </svg>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
        {/* Mobile Filters */}
        <div className="mb-6 lg:hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full justify-between h-12 rounded-xl bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all duration-300 shadow-sm"
              size="sm"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Filters & Sort
              </span>
              <motion.div
                animate={{ rotate: showFilters ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {showFilters ? <X className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
              </motion.div>
            </Button>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar - Mobile Collapsible with Animation */}
          <AnimatePresence>
            {(showFilters || !isMobile) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:block space-y-4"
              >
                {/* Sort Card */}
                <Card className="overflow-hidden border-0 shadow-lg shadow-gray-200/50 dark:shadow-black/20 bg-white dark:bg-slate-900/80 backdrop-blur-sm rounded-xl">
                  <div className="p-4 lg:p-5">
                    <h3 className="font-semibold mb-3 text-sm flex items-center gap-2 text-gray-900 dark:text-slate-100">
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Sort By
                    </h3>
                    <div className="space-y-1">
                      {[
                        { value: 'latest', label: 'Latest', icon: Clock },
                        { value: 'popular', label: 'Popular', icon: Heart },
                        { value: 'trending', label: 'Trending', icon: TrendingUp }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            updateURL('sort', option.value);
                            if (isMobile) setShowFilters(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                            sortBy === option.value
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30'
                              : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                          }`}
                        >
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Categories Card */}
                {categories.length > 0 && (
                  <Card className="overflow-hidden border-0 shadow-lg shadow-gray-200/50 dark:shadow-black/20 bg-white dark:bg-slate-900/80 backdrop-blur-sm rounded-xl">
                    <div className="p-4 lg:p-5">
                      <h3 className="font-semibold mb-3 text-sm flex items-center gap-2 text-gray-900 dark:text-slate-100">
                        <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Categories
                      </h3>
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setSelectedCategory('');
                            updateURL('category', '');
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                            !selectedCategory
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30'
                              : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                          }`}
                        >
                          All Categories
                        </button>
                        {categories.slice(0, 8).map((category) => (
                          <button
                            key={category.key || category.slug || category.id}
                            onClick={() => {
                              setSelectedCategory(category.slug);
                              updateURL('category', category.slug);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex justify-between items-center ${
                              selectedCategory === category.slug
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate">{category.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              selectedCategory === category.slug
                                ? 'bg-white/20'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                            }`}>
                              {category.postCount || 0}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Clear Filters */}
                {(searchQuery || selectedCategory || selectedTag || sortBy !== 'latest') && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full h-10 text-sm rounded-xl border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Posts Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="space-y-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl">
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-64 h-48 sm:h-56 skeleton-shine flex-shrink-0 rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none" />
                      <div className="p-6 flex-1 space-y-4">
                        <div className="space-y-3">
                          <div className="h-6 skeleton-shine rounded-lg w-4/5" />
                          <div className="h-4 skeleton-shine rounded-lg w-full" />
                          <div className="h-4 skeleton-shine rounded-lg w-3/4" />
                        </div>
                        <div className="flex space-x-2">
                          <div className="h-7 skeleton-shine rounded-full w-20" />
                          <div className="h-7 skeleton-shine rounded-full w-24" />
                        </div>
                        <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 skeleton-shine rounded-full" />
                              <div className="space-y-2">
                                <div className="h-4 skeleton-shine rounded w-28" />
                                <div className="h-3 skeleton-shine rounded w-20" />
                              </div>
                            </div>
                            <div className="flex space-x-4">
                              <div className="h-4 skeleton-shine rounded w-10" />
                              <div className="h-4 skeleton-shine rounded w-10" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="p-12 text-center border-0 shadow-xl bg-white dark:bg-slate-900 rounded-2xl">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-500/20 dark:to-emerald-600/20 rounded-full flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-slate-100">No articles found</h3>
                  <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">Try adjusting your filters or check back later for new content</p>
                  <Button onClick={clearFilters} className="btn-premium rounded-full px-8">
                    Clear Filters
                  </Button>
                </Card>
              </motion.div>
            ) : navigating ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 space-y-4"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-200 dark:border-emerald-900" />
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                </div>
                <p className="text-gray-600 dark:text-slate-400 font-medium">Loading article...</p>
              </motion.div>
            ) : (
              <div className="space-y-8">
                {/* Featured Posts */}
                {featuredPosts.length > 0 && (
                  <div>
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-center gap-3 mb-6"
                    >
                      <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Featured Articles</h2>
                    </motion.div>
                    <div className="space-y-6">
                      {featuredPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 40 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            delay: index * 0.15,
                            duration: 0.5,
                            ease: [0.4, 0, 0.2, 1]
                          }}
                          whileHover={{ y: -8 }}
                          className="group"
                        >
                          <Card className="blog-card-featured overflow-hidden border-0 bg-white dark:bg-slate-900/90 backdrop-blur-sm">
                            <div className="flex flex-col sm:flex-row relative">
                              {/* Gradient Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-transparent to-blue-50/30 dark:from-emerald-500/5 dark:via-transparent dark:to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
                              
                              {/* Image Container */}
                              <div className="relative w-full sm:w-80 lg:w-96 h-56 sm:h-64 lg:h-72 flex-shrink-0 overflow-hidden image-hover-zoom">
                                {post.featuredImage ? (
                                  <Image
                                    src={post.featuredImage}
                                    alt={post.title}
                                    fill
                                    className="object-cover transition-transform duration-700 ease-out"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100 dark:from-emerald-900/50 dark:via-emerald-800/30 dark:to-teal-900/50 flex items-center justify-center relative">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)]" />
                                    <Tag className="h-12 w-12 text-emerald-600/50 dark:text-emerald-400/50" />
                                  </div>
                                )}
                                
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                {/* Category Badge */}
                                {post.category && (
                                  <Badge className="absolute top-4 left-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/40 border-0 transition-all duration-300">
                                    {post.category.name}
                                  </Badge>
                                )}
                                
                                {/* Date Badge */}
                                {post.publishedAt && (
                                  <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 shadow-lg">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                                  </div>
                                )}
                              </div>
                              
                              {/* Content */}
                              <CardContent className="p-6 lg:p-8 flex-1 flex flex-col justify-between relative z-10">
                                <div className="space-y-4">
                                  {(() => {
                                    // Use AuthorProfile username if available, fallback to author name
                                    const authorPath = post.authorUsername || post.author.username || post.author.name.replace(/\s+/g, '-').toLowerCase();
                                    const postUrl = `/blog/${authorPath}/${post.slug}`;
                                    return (
                                      <Link 
                                        href={postUrl} 
                                        className="block group/link"
                                        prefetch={false}
                                        onClick={(e) => handlePostClick(e, postUrl)}
                                      >
                                        <h3 className="font-bold mb-3 line-clamp-2 text-xl lg:text-2xl leading-tight text-gray-900 dark:text-slate-100 group-hover/link:text-emerald-600 dark:group-hover/link:text-emerald-400 transition-colors duration-300">
                                          {post.title}
                                        </h3>
                                        <MarkdownExcerpt
                                          content={post.excerpt}
                                          clampLines={3}
                                          className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed"
                                        />
                                      </Link>
                                    );
                                  })()}
                                  
                                  {/* Reading Time & Views */}
                                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
                                    {post.readingTime && (
                                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{post.readingTime} min read</span>
                                      </div>
                                    )}
                                    {post.views && (
                                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>{post.views.toLocaleString()} views</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Author Section */}
                                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-800">
                                  <div className="flex items-center justify-between">
                                    {(() => {
                                      // Get AuthorProfile data
                                      const authorDisplayName = post.authorDisplayName || post.author.displayName || post.author.name;
                                      const authorUsername = post.authorUsername || post.author.username;
                                      const authorAvatar = post.authorAvatarUrl || post.author.avatarUrl || post.author.avatar;
                                      const authorIsVerified = post.authorIsVerified || post.author.isVerified;
                                      const authorProfileUrl = authorUsername ? `/author/${authorUsername}` : `/blog/author/${post.author.id}`;
                                      
                                      return (
                                        <div className="flex items-center space-x-3">
                                          <div className="relative avatar-ring">
                                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/30 ring-2 ring-white dark:ring-slate-900">
                                              {authorAvatar ? (
                                                <Image
                                                  src={authorAvatar}
                                                  alt={authorDisplayName}
                                                  fill
                                                  className="rounded-full object-cover"
                                                />
                                              ) : (
                                                authorDisplayName.charAt(0).toUpperCase()
                                              )}
                                            </div>
                                            {authorIsVerified ? (
                                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                                <span className="text-white text-[8px]">✓</span>
                                              </div>
                                            ) : (
                                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 pulse-glow" />
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <Link href={authorProfileUrl} className="group/author">
                                              <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm group-hover/author:text-emerald-600 dark:group-hover/author:text-emerald-400 transition-colors truncate flex items-center gap-1">
                                                {authorDisplayName}
                                                {authorIsVerified && <span className="text-emerald-500 text-xs">✓</span>}
                                              </p>
                                              {authorUsername && (
                                                <p className="text-xs text-gray-500 dark:text-slate-500">@{authorUsername}</p>
                                              )}
                                              <p className="text-xs text-gray-500 dark:text-slate-500 flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {post.author._count?.followers || 0} followers
                                              </p>
                                            </Link>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                    
                                    <div className="flex items-center space-x-4">
                                      <button className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors group/like">
                                        <Heart className="h-5 w-5 group-hover/like:scale-110 transition-transform" />
                                        <span className="font-medium text-sm stat-counter">{post._count.likes}</span>
                                      </button>
                                      <button className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group/comment">
                                        <MessageCircle className="h-5 w-5 group-hover/comment:scale-110 transition-transform" />
                                        <span className="font-medium text-sm stat-counter">{post._count.comments}</span>
                                      </button>
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
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="flex items-center gap-3 mb-6"
                    >
                      <div className="p-2 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30">
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Latest Articles</h2>
                    </motion.div>
                    <div className="space-y-5">
                      {regularPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ 
                            delay: 0.3 + index * 0.08,
                            duration: 0.4,
                            ease: [0.4, 0, 0.2, 1]
                          }}
                          whileHover={{ x: 4, y: -4 }}
                          className="group"
                        >
                          <Card className="blog-card overflow-hidden">
                            <div className="flex flex-col sm:flex-row">
                              {/* Image */}
                              <div className="relative w-full sm:w-56 lg:w-72 h-44 sm:h-52 flex-shrink-0 overflow-hidden image-hover-zoom">
                                {post.featuredImage ? (
                                  <Image
                                    src={post.featuredImage}
                                    alt={post.title}
                                    fill
                                    className="object-cover transition-transform duration-500"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-100 via-slate-100 to-gray-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 flex items-center justify-center">
                                    <Tag className="h-8 w-8 text-gray-400 dark:text-slate-600" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {post.category && (
                                  <Badge className="absolute top-3 left-3 bg-emerald-600/90 hover:bg-emerald-700 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-md border-0">
                                    {post.category.name}
                                  </Badge>
                                )}
                                {post.publishedAt && (
                                  <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-medium">
                                    {format(new Date(post.publishedAt), 'MMM d')}
                                  </div>
                                )}
                              </div>
                              
                              {/* Content */}
                              <CardContent className="p-5 lg:p-6 flex-1 flex flex-col justify-between card-content-hover">
                                <div className="space-y-3">
                                  {(() => {
                                    // Use AuthorProfile username if available
                                    const authorPath = post.authorUsername || post.author.username || post.author.name.replace(/\s+/g, '-').toLowerCase();
                                    const postUrl = `/blog/${authorPath}/${post.slug}`;
                                    return (
                                      <Link 
                                        href={postUrl} 
                                        className="block group/link"
                                        prefetch={false}
                                        onClick={(e) => handlePostClick(e, postUrl)}
                                      >
                                        <h3 className="font-bold mb-2 line-clamp-2 text-lg leading-tight text-gray-900 dark:text-slate-100 group-hover/link:text-emerald-600 dark:group-hover/link:text-emerald-400 transition-colors duration-200">
                                          {post.title}
                                        </h3>
                                        <MarkdownExcerpt
                                          content={post.excerpt}
                                          clampLines={2}
                                          className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed"
                                        />
                                      </Link>
                                    );
                                  })()}
                                  
                                  {/* Tags */}
                                  {post.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {post.tags.slice(0, 3).map((tag) => (
                                        <span
                                          key={tag.id}
                                          className="tag-chip cursor-pointer"
                                        >
                                          #{tag.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Author & Stats */}
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                                  <div className="flex items-center justify-between">
                                    {(() => {
                                      // Use AuthorProfile data with fallbacks
                                      const authorDisplayName = post.authorDisplayName || post.author.displayName || post.author.name;
                                      const authorUsername = post.authorUsername || post.author.username;
                                      const authorAvatar = post.authorAvatarUrl || post.author.avatarUrl || post.author.avatar;
                                      const authorIsVerified = post.authorIsVerified || post.author.isVerified;
                                      const authorProfileUrl = authorUsername ? `/author/${authorUsername}` : `/blog/author/${post.author.id}`;
                                      
                                      return (
                                        <div className="flex items-center space-x-2.5">
                                          <div className="relative">
                                            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium text-xs shadow-md ring-2 ring-white dark:ring-slate-900">
                                              {authorAvatar ? (
                                                <Image
                                                  src={authorAvatar}
                                                  alt={authorDisplayName}
                                                  fill
                                                  className="rounded-full object-cover"
                                                />
                                              ) : (
                                                authorDisplayName.charAt(0).toUpperCase()
                                              )}
                                            </div>
                                            {/* Verification Badge */}
                                            {authorIsVerified && (
                                              <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5">
                                                <BadgeCheck className="h-2.5 w-2.5 text-white" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <Link href={authorProfileUrl} className="group/author">
                                              <p className="font-medium text-gray-900 dark:text-slate-200 text-sm group-hover/author:text-emerald-600 dark:group-hover/author:text-emerald-400 transition-colors truncate">
                                                {authorDisplayName}
                                              </p>
                                              {authorUsername && (
                                                <p className="text-xs text-gray-500 dark:text-slate-500 truncate">
                                                  @{authorUsername}
                                                </p>
                                              )}
                                            </Link>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                    
                                    <div className="flex items-center space-x-3 text-sm">
                                      <button className="flex items-center gap-1 text-gray-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
                                        <Heart className="h-4 w-4" />
                                        <span className="font-medium">{post._count.likes}</span>
                                      </button>
                                      <button className="flex items-center gap-1 text-gray-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                                        <MessageCircle className="h-4 w-4" />
                                        <span className="font-medium">{post._count.comments}</span>
                                      </button>
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

                {/* Find More Blogs Section */}
                {pagination && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-10"
                  >
                    <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 rounded-2xl">
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-400/20 to-transparent rounded-full blur-3xl" />
                      <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-teal-400/20 to-transparent rounded-full blur-3xl" />
                      
                      <CardContent className="relative p-8 sm:p-10">
                        <div className="text-center space-y-5">
                          {/* Stats */}
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-full">
                            <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                              {posts.length} of {pagination.totalPosts} articles
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="max-w-sm mx-auto">
                            <div className="h-2.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                              <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 rounded-full shadow-lg shadow-emerald-500/50"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((posts.length / pagination.totalPosts) * 100, 100)}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                          </div>

                          {pagination.hasNextPage ? (
                            <>
                              <div className="space-y-3">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                                  Discover More Articles
                                </h3>
                                <p className="text-gray-600 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{pagination.totalPosts - posts.length}</span> more articles waiting for you. 
                                  Keep exploring expert insights and tips!
                                </p>
                              </div>

                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button
                                  onClick={loadMorePosts}
                                  disabled={loadingMore}
                                  size="lg"
                                  className="btn-premium px-10 py-4 rounded-full text-base font-semibold group"
                                >
                                  {loadingMore ? (
                                    <>
                                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                      Loading...
                                    </>
                                  ) : (
                                    <>
                                      <span>Explore More</span>
                                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                  )}
                                </Button>
                              </motion.div>

                              {/* Page indicator */}
                              <p className="text-xs text-gray-500 dark:text-slate-500">
                                Page {pagination.currentPage} of {pagination.totalPages}
                              </p>
                            </>
                          ) : (
                            <div className="space-y-4 py-4">
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"
                              >
                                <span className="text-3xl">🎉</span>
                              </motion.div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                                You&apos;ve explored all articles!
                              </h3>
                              <p className="text-gray-600 dark:text-slate-400 text-sm max-w-md mx-auto">
                                You&apos;ve reached the end. Check back soon for new content or browse by category.
                              </p>
                              {(selectedCategory || selectedTag || searchQuery) && (
                                <Button
                                  onClick={clearFilters}
                                  variant="outline"
                                  className="mt-3 rounded-full border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                >
                                  Browse All Articles
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Back to Top/Bottom Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
          >
            {/* Scroll to Top */}
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3.5 rounded-full shadow-xl backdrop-blur-sm transition-all duration-300 ${
                !isNearBottom 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60 ring-2 ring-white/20' 
                  : 'bg-white/90 dark:bg-slate-800/90 text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
              }`}
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>

            {/* Scroll to Bottom */}
            <motion.button
              onClick={scrollToBottom}
              whileHover={{ scale: 1.1, y: 2 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3.5 rounded-full shadow-xl backdrop-blur-sm transition-all duration-300 ${
                isNearBottom 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60 ring-2 ring-white/20' 
                  : 'bg-white/90 dark:bg-slate-800/90 text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
              }`}
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="h-5 w-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}