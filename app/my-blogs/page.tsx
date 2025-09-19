'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Clock, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Search,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import PublicNavbar from '@/components/layout/public-navbar';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string;
  category: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DRAFT';
  submittedAt?: Date;
  publishedAt?: Date;
  readingTime: number;
  rejectionReason?: string;
  views: number;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

const statusConfig = {
  PENDING_APPROVAL: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    description: 'Your post is being reviewed by our team'
  },
  APPROVED: {
    label: 'Published',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    description: 'Your post is live and visible to readers'
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    description: 'Your post needs revisions before publication'
  },
  DRAFT: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800',
    icon: FileText,
    description: 'Your post is saved as a draft'
  }
};

export default function MyBlogsPage() {
  const [user, setUser] = useState<any>(null);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndBlogs = async () => {
      try {
        // Check if user is logged in
        const userResponse = await fetch('/api/auth/me');
        if (!userResponse.ok) {
          router.push('/auth/login');
          return;
        }

        const userData = await userResponse.json();
        setUser(userData);

        // Fetch user's blog posts
        const blogsResponse = await fetch('/api/blog/my-posts');
        if (blogsResponse.ok) {
          const blogsData = await blogsResponse.json();
          setBlogs(blogsData.posts || []);
        } else {
          toast.error('Failed to load your blog posts');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('An error occurred while loading your blogs');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndBlogs();
  }, [router]);

  const filteredAndSortedBlogs = blogs
    .filter(blog => {
      const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || blog.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.submittedAt || b.publishedAt || '').getTime() - 
                 new Date(a.submittedAt || a.publishedAt || '').getTime();
        case 'oldest':
          return new Date(a.submittedAt || a.publishedAt || '').getTime() - 
                 new Date(b.submittedAt || b.publishedAt || '').getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'views':
          return (b.views || 0) - (a.views || 0);
        default:
          return 0;
      }
    });

  const deleteBlog = async (blogId: string) => {
    if (!confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/blog/posts/${blogId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setBlogs(blogs.filter(blog => blog.id !== blogId));
        toast.success('Blog post deleted successfully');
      } else {
        toast.error('Failed to delete blog post');
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error('An error occurred while deleting the blog post');
    }
  };

  const getStatusStats = () => {
    const stats = {
      total: blogs.length,
      pending: blogs.filter(b => b.status === 'PENDING_APPROVAL').length,
      approved: blogs.filter(b => b.status === 'APPROVED').length,
      rejected: blogs.filter(b => b.status === 'REJECTED').length,
      draft: blogs.filter(b => b.status === 'DRAFT').length,
    };
    return stats;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <PublicNavbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your blog posts...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = getStatusStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <PublicNavbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Blog Posts</h1>
              <p className="text-gray-600 mt-2">
                Manage and track your submitted blog posts
              </p>
            </div>
            <Link href="/blog/submit">
              <Button className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Write New Blog
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Posts</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <div className="text-sm text-gray-600">Published</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
                <div className="text-sm text-gray-600">Drafts</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters and Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search your blog posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending Review</SelectItem>
              <SelectItem value="APPROVED">Published</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="DRAFT">Drafts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="views">Views</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Blog Posts List */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {filteredAndSortedBlogs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {blogs.length === 0 ? 'No blog posts yet' : 'No posts found'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {blogs.length === 0 
                    ? 'Start sharing your poultry knowledge with the community!'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
                {blogs.length === 0 && (
                  <Link href="/blog/submit">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Write Your First Blog
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedBlogs.map((blog, index) => {
              const statusInfo = statusConfig[blog.status];
              const StatusIcon = statusInfo.icon;
              
              return (
                <motion.div
                  key={blog.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Featured Image */}
                        {blog.featuredImage && (
                          <div className="w-full lg:w-48 h-32 lg:h-24 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={blog.featuredImage}
                              alt={blog.title}
                              width={200}
                              height={100}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        )}
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 truncate pr-4">
                              {blog.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {blog.status === 'APPROVED' && (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/blog/${user?.name.replace(/\s+/g, '-').toLowerCase()}/${blog.slug}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Post
                                      </Link>
                                    </DropdownMenuItem>
                                  )}
                                  {(blog.status === 'DRAFT' || blog.status === 'REJECTED') && (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/blog/edit/${blog.id}`}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </Link>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => deleteBlog(blog.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {blog.excerpt}
                          </p>
                          
                          {/* Rejection Reason */}
                          {blog.status === 'REJECTED' && blog.rejectionReason && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-red-800">Feedback from Review</p>
                                  <p className="text-sm text-red-700 mt-1">{blog.rejectionReason}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Meta Information */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {blog.submittedAt ? (
                                `Submitted ${new Date(blog.submittedAt).toLocaleDateString()}`
                              ) : blog.publishedAt ? (
                                `Published ${new Date(blog.publishedAt).toLocaleDateString()}`
                              ) : (
                                'Draft'
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {blog.readingTime} min read
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {blog.category.replace('_', ' ')}
                            </div>
                            {blog.views > 0 && (
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {blog.views} views
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
}