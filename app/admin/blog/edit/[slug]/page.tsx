'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import BlogEditor from '@/components/blog/blog-editor';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Edit, Clock, Globe, Calendar, Hash, Heart, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface BlogPostData {
  title: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  category: string;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
  featured: boolean;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  publishedAt?: string;
  scheduledAt?: string;
}

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default function EditBlogPostPage({ params }: Props) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<Partial<BlogPostData> | undefined>();
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [postStats, setPostStats] = useState<any>(null);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'ADMIN') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  // Fetch existing post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/blog/posts/${resolvedParams.slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Blog post not found');
            router.push('/admin/blog');
            return;
          }
          throw new Error('Failed to fetch post');
        }

        const post = await response.json();
        
        // Transform data for editor
        setInitialData({
          title: post.title,
          content: post.content,
          excerpt: post.excerpt || '',
          featuredImage: post.featuredImage || '',
          category: post.category,
          tags: post.tags.map((tag: any) => tag.name),
          status: post.status,
          featured: post.featured,
          metaDescription: post.metaDescription || '',
          metaKeywords: post.metaKeywords || '',
          ogTitle: post.ogTitle || '',
          ogDescription: post.ogDescription || '',
          ogImage: post.ogImage || '',
          twitterTitle: post.twitterTitle || '',
          twitterDescription: post.twitterDescription || '',
          twitterImage: post.twitterImage || '',
          publishedAt: post.publishedAt,
          scheduledAt: post.scheduledAt,
        });

        // Set post stats
        setPostStats({
          views: post.views || 0,
          likes: post._count?.likedBy || 0,
          comments: post._count?.comments || 0,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt
        });
      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('Failed to load blog post');
        router.push('/admin/blog');
      } finally {
        setFetchLoading(false);
      }
    };

    if (user) {
      fetchPost();
    }
  }, [resolvedParams.slug, router, user]);

  const handleSave = async (data: BlogPostData) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/blog/posts/${resolvedParams.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update post');
      }

      const result = await response.json();
      
      toast.success(
        data.status === 'PUBLISHED' 
          ? '🎉 Post updated and published successfully!' 
          : '💾 Post updated successfully!'
      );

      // If slug changed, redirect to new URL
      if (result.slug !== resolvedParams.slug) {
        router.push(`/admin/blog/edit/${result.slug}`);
      }
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/blog');
  };

  // Show loading state while fetching user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600 font-medium">Preparing your workspace...</p>
        </motion.div>
      </div>
    );
  }

  if (fetchLoading) {
    return (
      <DashboardLayout user={user}>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white flex items-center justify-center">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-gray-600 font-medium">Loading blog post...</p>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (!initialData) {
    return (
      <DashboardLayout user={user}>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white flex items-center justify-center">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-gray-600 font-medium">Blog post not found</p>
            <Button
              onClick={() => router.push('/admin/blog')}
              variant="outline"
              className="mt-4"
            >
              Back to Blog Management
            </Button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Header Section */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
              <div className="flex items-start space-x-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-white/50 transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back to Blog</span>
                  </Button>
                </motion.div>
                
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-700 via-sky-700 to-blue-800 bg-clip-text text-transparent">
                    Edit Blog Post
                  </h1>
                  <p className="text-slate-600 mt-1 text-sm sm:text-base">
                    Make changes to your blog post
                  </p>
                  {initialData.title && (
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                      &ldquo;{initialData.title}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Badge 
                    variant={initialData.status === 'PUBLISHED' ? 'default' : 'secondary'}
                    className="bg-white/70 border-sky-200 text-sky-700"
                  >
                    <Globe className="h-3 w-3 mr-1" />
                    {initialData.status}
                  </Badge>
                </motion.div>
                
                {initialData.featured && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Badge variant="outline" className="bg-white/70 border-emerald-200 text-emerald-700">
                      ⭐ Featured
                    </Badge>
                  </motion.div>
                )}

                {postStats && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Badge variant="outline" className="bg-white/70 border-emerald-200 text-emerald-700">
                      <Eye className="h-3 w-3 mr-1" />
                      {postStats.views} views
                    </Badge>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Post Stats Cards */}
          {postStats && (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-gradient-to-br from-sky-50 via-cyan-50 to-sky-100 border-sky-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-sky-500 rounded-lg">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sky-600 font-medium text-sm">Views</p>
                        <p className="text-sky-900 font-bold text-lg">{postStats.views}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-500 rounded-lg">
                        <Heart className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-emerald-600 font-medium text-sm">Likes</p>
                        <p className="text-emerald-900 font-bold text-lg">{postStats.likes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-gradient-to-br from-teal-50 via-sky-50 to-cyan-100 border-cyan-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-cyan-500 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-cyan-700 font-medium text-sm">Comments</p>
                        <p className="text-cyan-900 font-bold text-lg">{postStats.comments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-gradient-to-br from-blue-50 via-sky-50 to-emerald-50 border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-blue-600 font-medium text-sm">Updated</p>
                        <p className="text-blue-900 font-bold text-xs">
                          {new Date(postStats.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {/* Editor Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-white/80 backdrop-blur-md border-emerald-100 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-emerald-50 via-sky-50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <Edit className="h-5 w-5" />
                      Blog Editor
                    </CardTitle>
                    <CardDescription>
                      Make changes to your blog post content and settings
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className="flex items-center gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          {isPreviewMode ? 'Exit Preview' : 'Preview'}
                        </span>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isPreviewMode ? 'preview' : 'editor'}
                    initial={{ opacity: 0, x: isPreviewMode ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isPreviewMode ? -20 : 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <BlogEditor
                      initialData={initialData}
                      onSave={handleSave}
                      onCancel={handleCancel}
                      isEditing={true}
                      loading={loading}
                    />
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}