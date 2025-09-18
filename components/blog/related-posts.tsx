'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  User,
  Eye,
  ArrowRight,
  TrendingUp,
  ThumbsUp
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string;
  readingTime: number;
  publishedAt: string;
  category: string;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  views: number;
  likes: number;
}

interface RelatedPostsProps {
  currentPostId: string;
  currentPostSlug: string;
  category?: string;
  tags?: string[];
  className?: string;
  maxPosts?: number;
}

export default function RelatedPosts({
  currentPostId,
  currentPostSlug,
  category,
  tags = [],
  className = '',
  maxPosts = 3
}: RelatedPostsProps) {
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedPosts = async () => {
      try {
        const params = new URLSearchParams({
          exclude: currentPostId,
          limit: maxPosts.toString(),
        });

        if (category) {
          params.append('category', category);
        }
        
        if (tags.length > 0) {
          params.append('tags', tags.join(','));
        }

        const response = await fetch(`/api/blog/posts/related?${params}`);
        if (response.ok) {
          const data = await response.json();
          setRelatedPosts(data.posts || []);
        }
      } catch (error) {
        console.error('Error fetching related posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedPosts();
  }, [currentPostId, category, tags, maxPosts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getReadingTime = (minutes: number) => {
    if (!minutes) return 'Quick read';
    return `${minutes} min read`;
  };

  const getCategoryInfo = (category: string) => {
    const categories: Record<string, { name: string; color: string }> = {
      'feed-nutrition': { name: 'Feed & Nutrition', color: 'bg-amber-100 text-amber-800' },
      'breeding-genetics': { name: 'Breeding & Genetics', color: 'bg-pink-100 text-pink-800' },
      'health-disease': { name: 'Health & Disease', color: 'bg-red-100 text-red-800' },
      'housing-environment': { name: 'Housing & Environment', color: 'bg-blue-100 text-blue-800' },
      'business-management': { name: 'Business Management', color: 'bg-green-100 text-green-800' },
      'market-trends': { name: 'Market Trends', color: 'bg-purple-100 text-purple-800' },
      'technology-innovation': { name: 'Technology & Innovation', color: 'bg-indigo-100 text-indigo-800' },
      'sustainability': { name: 'Sustainability', color: 'bg-emerald-100 text-emerald-800' }
    };
    return categories[category] || { name: category, color: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-6 w-6 text-emerald-600" />
          <h2 className="text-2xl font-bold text-gray-900">Related Articles</h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: maxPosts }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-t-lg" />
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (relatedPosts.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No related articles found</h3>
        <p className="text-gray-500 mb-4">Check out our latest blog posts instead</p>
        <Button asChild variant="outline">
          <Link href="/blog">
            View All Articles
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-6 w-6 text-emerald-600" />
        <h2 className="text-2xl font-bold text-gray-900">Related Articles</h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedPosts.map((post, index) => {
          const categoryInfo = getCategoryInfo(post.category);
          
          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-emerald-300 h-full">
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="relative aspect-video overflow-hidden rounded-t-lg">
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-green-200 flex items-center justify-center">
                        <div className="text-emerald-600 text-6xl font-bold opacity-20">
                          {post.title.charAt(0)}
                        </div>
                      </div>
                    )}
                    
                    <Badge className={`absolute top-3 left-3 ${categoryInfo.color} border-0`}>
                      {categoryInfo.name}
                    </Badge>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-gray-600">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(post.publishedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{getReadingTime(post.readingTime)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="h-3 w-3" />
                        <span>{post.author.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{post.views}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{post.likes}</span>
                        </div>
                      </div>
                    </div>

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {post.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="text-xs bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {post.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">
                            +{post.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {relatedPosts.length >= maxPosts && (
        <div className="text-center pt-6">
          <Button asChild variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Link href="/blog">
              View More Articles
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}