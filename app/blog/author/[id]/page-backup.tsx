'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  category: string;
  viewCount: number;
  likes: number;
  publishedAt: string;
  comments: { id: string }[];
}

interface AuthorProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
  posts: BlogPost[];
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
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedParams = use(params);
  const { id: authorId } = resolvedParams;

  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const response = await fetch(`/api/blog/authors/${authorId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Author not found');
          } else {
            setError('Failed to load author profile');
          }
          return;
        }

        const data = await response.json();
        setAuthor(data);
      } catch (error) {
        console.error('Error fetching author:', error);
        setError('Failed to load author profile');
      } finally {
        setLoading(false);
      }
    };

    if (authorId) {
      fetchAuthor();
    }
  }, [authorId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return `${readingTime} min read`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (error || !author) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error || 'Author not found'}
            </h1>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      
      {/* Header with back button */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button 
            onClick={() => router.back()} 
            variant="ghost" 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Author Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  {author.avatar ? (
                    <Image
                      src={author.avatar}
                      alt={author.name}
                      width={120}
                      height={120}
                      className="w-30 h-30 rounded-full mx-auto mb-4 object-cover"
                    />
                  ) : (
                    <div className="w-30 h-30 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <User className="h-12 w-12 text-emerald-600" />
                    </div>
                  )}
                  
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {author.name}
                  </h1>
                  
                  {author.bio && (
                    <p className="text-gray-600 mb-4">
                      {author.bio}
                    </p>
                  )}

                  <div className="flex items-center justify-center text-sm text-gray-500 mb-6">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Joined {formatDate(author.createdAt)}</span>
                  </div>

                  <FollowButton authorId={author.id} />
                </div>

                <Separator className="my-6" />

                {/* Stats */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium">Posts</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {author._count.posts}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium">Followers</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {author._count.followers}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserPlus className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium">Following</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {author._count.following}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Blog Posts */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Blog Posts by {author.name}
                </h2>
                <p className="text-gray-600">
                  {author._count.posts} {author._count.posts === 1 ? 'post' : 'posts'} published
                </p>
              </div>

              {author.posts.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No posts yet
                    </h3>
                    <p className="text-gray-600">
                      {author.name} hasn&apos;t published any blog posts yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {author.posts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow duration-300">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row gap-6">
                            {post.featuredImage && (
                              <div className="md:w-48 flex-shrink-0">
                                <Image
                                  src={post.featuredImage}
                                  alt={post.title}
                                  width={300}
                                  height={200}
                                  className="w-full h-40 object-cover rounded-lg"
                                />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <Badge className={
                                  BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.icon} 
                                  {BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.name}
                                </Badge>
                                
                                <span className="text-sm text-gray-500">
                                  {formatDate(post.publishedAt)}
                                </span>
                              </div>
                              
                              <Link href={`/blog/${post.slug}`}>
                                <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-emerald-600 transition-colors line-clamp-2">
                                  {post.title}
                                </h3>
                              </Link>
                              
                              {post.excerpt && (
                                <p className="text-gray-600 mb-4 line-clamp-2">
                                  {post.excerpt}
                                </p>
                              )}
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <Eye className="h-4 w-4" />
                                  <span>{post.viewCount} views</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Heart className="h-4 w-4" />
                                  <span>{post.likes} likes</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MessageCircle className="h-4 w-4" />
                                  <span>{post.comments.length} comments</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}