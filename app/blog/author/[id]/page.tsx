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
  ChevronRight
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading author profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Author not found</h1>
            <p className="text-gray-600 mb-8">The author profile you&apos;re looking for doesn&apos;t exist.</p>
            <Button onClick={() => router.push('/blog')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const filteredPosts = getFilteredPosts();
  const categories = Array.from(new Set(author.blogPosts?.map(post => post.category) || [])) as string[];

  return (
    <>
      <PublicNavbar />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/blog" className="hover:text-emerald-600 transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">Authors</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium truncate">{author.name}</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40">
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
                  className="rounded-full mx-auto ring-4 ring-white shadow-2xl"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center mx-auto ring-4 ring-white shadow-2xl">
                  <User className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
                </div>
              )}
              
              {/* Online indicator */}
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
            </div>

            {/* Author Info */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {author.name}
            </h1>

            {author.bio && (
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6 leading-relaxed">
                {author.bio}
              </p>
            )}

            {/* Author Meta */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-600 mb-8">
              {author.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{author.location}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatDate(author.createdAt)}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-md mx-auto mb-8">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{author._count.blogPosts}</div>
                <div className="text-sm sm:text-base text-gray-600">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">{author._count.followers}</div>
                <div className="text-sm sm:text-base text-gray-600">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-indigo-600">{author._count.following}</div>
                <div className="text-sm sm:text-base text-gray-600">Following</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {currentUser && currentUser.id !== author.id && (
                <FollowButton
                  userId={author.id}
                  initialFollowing={isFollowing}
                  onFollowChange={setIsFollowing}
                  className="min-w-[120px]"
                />
              )}
              
              {/* Social Links */}
              <div className="flex items-center space-x-3">
                {author.website && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={author.website} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-emerald-600">
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {author.twitter && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`https://twitter.com/${author.twitter}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-500">
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {author.linkedin && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={author.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-700">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-emerald-600">
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:inline-flex">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Posts</span>
              <Badge variant="secondary" className="ml-1">{author._count.blogPosts}</Badge>
            </TabsTrigger>
            <TabsTrigger value="followers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Followers</span>
              <Badge variant="secondary" className="ml-1">{author._count.followers}</Badge>
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Following</span>
              <Badge variant="secondary" className="ml-1">{author._count.following}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-8">
            {/* Controls */}
            {author.blogPosts && author.blogPosts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                    <span className="text-sm text-gray-500">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Posts Grid/List */}
            {filteredPosts.length > 0 ? (
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {filteredPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-lg overflow-hidden bg-white">
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
                            <Badge className={`${BLOG_CATEGORIES[post.category as keyof typeof BLOG_CATEGORIES]?.color || 'bg-gray-100 text-gray-800'} font-medium`}>
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

                        <Link href={`/blog/${post.slug}`}>
                          <h3 className="font-bold text-xl text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2 cursor-pointer">
                            {post.title}
                          </h3>
                        </Link>

                        {post.excerpt && (
                          <p className="text-gray-600 line-clamp-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}

                        {/* Tags */}
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="text-xs hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors cursor-pointer"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {post.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{post.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Post Meta */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(post.publishedAt)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{getReadingTime(post.readingTime)}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 text-sm text-gray-500">
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
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts found</h3>
                <p className="text-gray-600">
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
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Followers</h3>
              <p className="text-gray-600 mb-4">{author._count.followers} people follow {author.name}</p>
              {/* TODO: Implement followers list */}
              <p className="text-sm text-gray-500">Followers list coming soon...</p>
            </div>
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="mt-8">
            <div className="text-center py-12">
              <UserPlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Following</h3>
              <p className="text-gray-600 mb-4">{author.name} follows {author._count.following} people</p>
              {/* TODO: Implement following list */}
              <p className="text-sm text-gray-500">Following list coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}