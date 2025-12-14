'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PublicNavbar from '@/components/layout/public-navbar';
import BlogSubmissionForm from '@/components/blog/blog-submission-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  FileText, 
  Sparkles,
  RefreshCw,
  Eye,
  Calendar,
  Tag,
  Lightbulb,
  Send,
  Info,
  Edit3,
  History
} from 'lucide-react';
import { toast } from 'sonner';

interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

interface BlogPostResponse {
  id: string;
  title: string;
  content: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  images: string[];
  category: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  rejectionReason?: string | null;
  submissionNotes?: string | null;
  submittedAt?: string | null;
  publishedAt?: string | null;
  viewCount?: number;
  tags: BlogTag[];
}

interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
}

const statusMeta = {
  PENDING_APPROVAL: {
    label: 'Pending Review',
    description: 'Our editors are reviewing your updates. You\'ll receive an email once the review is complete.',
    tone: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
    icon: Clock,
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  REJECTED: {
    label: 'Needs Revisions',
    description: 'Please address the feedback below and resubmit for approval.',
    tone: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/30',
    bgGradient: 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30',
    icon: AlertCircle,
    iconColor: 'text-red-500 dark:text-red-400',
  },
  DRAFT: {
    label: 'Draft',
    description: 'Complete your article and submit it for review when ready.',
    tone: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50',
    icon: FileText,
    iconColor: 'text-slate-500 dark:text-slate-400',
  },
  APPROVED: {
    label: 'Published',
    description: 'Your article is live! Any edits will be sent for re-approval.',
    tone: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
    icon: CheckCircle,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
  PUBLISHED: {
    label: 'Published',
    description: 'Your article is live! Any edits will be sent for re-approval.',
    tone: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
    icon: CheckCircle,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
  ARCHIVED: {
    label: 'Archived',
    description: 'This article is hidden from readers. Contact support to restore it.',
    tone: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50',
    icon: FileText,
    iconColor: 'text-slate-500 dark:text-slate-400',
  },
} as const;

const loginPath = '/auth/login?next=/my-blogs';

type BlogSubmissionPayload = {
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  images: string[];
  category: string;
  tags: string[];
  submissionNotes?: string;
  accentColor?: string;
};

export default function EditBlogPostPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [post, setPost] = useState<BlogPostResponse | null>(null);
  const [initialData, setInitialData] = useState<BlogSubmissionPayload | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userLoading, setUserLoading] = useState(true);

  const slug = params?.slug;

  const fetchCurrentUser = useCallback(async () => {
    try {
      setUserLoading(true);
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        if (response.status === 401) {
          setCurrentUser(null);
          router.push(loginPath);
        }
        return;
      }
      const data: CurrentUser = await response.json();
      setCurrentUser(data);
    } catch (error) {
      console.error('Failed to load user', error);
      toast.error('Unable to load your profile. Please sign in again.');
      router.push(loginPath);
    } finally {
      setUserLoading(false);
    }
  }, [router]);

  const fetchPost = useCallback(async () => {
    if (!slug) return;
    try {
      setLoadingPost(true);
      const response = await fetch(`/api/blog/posts/${slug}`);
      if (response.status === 401) {
        router.push(loginPath);
        return;
      }
      if (response.status === 404) {
        toast.error('We could not find that blog post.');
        router.push('/my-blogs');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to load blog post');
      }
      const data: BlogPostResponse = await response.json();
      setPost(data);
      setInitialData({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt ?? undefined,
        featuredImage: data.featuredImage ?? undefined,
        images: data.images ?? [],
        category: data.category,
        tags: (data.tags || []).map((tag) => tag.name),
        submissionNotes: data.submissionNotes ?? undefined,
      });
    } catch (error) {
      console.error('Failed to load blog post', error);
      toast.error('Unable to load this blog post. Please try again.');
      router.push('/my-blogs');
    } finally {
      setLoadingPost(false);
    }
  }, [router, slug]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const statusDetails = useMemo(() => {
    if (!post) return null;
    return statusMeta[post.status];
  }, [post]);

  const handleUpdate = async (data: BlogSubmissionPayload) => {
    if (!slug) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/blog/posts/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          excerpt: data.excerpt,
          featuredImage: data.featuredImage,
          images: data.images,
          category: data.category,
          tags: data.tags,
          submissionNotes: data.submissionNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        toast.error(errorData?.error || 'Failed to update blog post');
        return;
      }

      const result = await response.json();
      
      if (result.resubmitted) {
        toast.success('Blog post updated and resubmitted for approval! You\'ll receive an email when it\'s reviewed.');
      } else {
        toast.success('Blog post updated successfully!');
      }
      
      router.push('/my-blogs');
    } catch (error) {
      console.error('Failed to update blog', error);
      toast.error('Something went wrong while saving your changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingPost || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Animated loader */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-emerald-200 dark:border-emerald-900/50" />
              <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
              <div className="absolute inset-2 w-16 h-16 rounded-full border-4 border-transparent border-b-teal-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-gray-700 dark:text-slate-300">Loading your blog post...</p>
              <p className="text-sm text-gray-500 dark:text-slate-500">Preparing the editor</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post || !initialData) {
    return null;
  }

  const StatusIcon = statusDetails?.icon ?? FileText;
  const isPublished = post.status === 'PUBLISHED' || post.status === 'APPROVED';
  const isPending = post.status === 'PENDING_APPROVAL';
  const isRejected = post.status === 'REJECTED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 transition-colors duration-300">
      <PublicNavbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Button 
              variant="ghost" 
              className="gap-2 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors group"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-gray-700 dark:text-slate-300">Back to My Blogs</span>
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge className={`${statusDetails?.badge} border px-4 py-1.5 text-sm font-medium`}>
              <StatusIcon className={`h-3.5 w-3.5 mr-1.5 ${statusDetails?.iconColor}`} />
              {statusDetails?.label}
            </Badge>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className={`overflow-hidden border-0 shadow-xl bg-gradient-to-br ${statusDetails?.bgGradient} dark:border dark:border-slate-800`}>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-400/20 to-transparent rounded-full blur-2xl" />
                
                <CardHeader className="relative pb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-lg ${statusDetails?.iconColor}`}>
                      <StatusIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 truncate">
                        {post.title}
                      </CardTitle>
                      <CardDescription className={`mt-2 text-sm ${statusDetails?.tone}`}>
                        {statusDetails?.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="relative space-y-4">
                  {/* Rejection Feedback */}
                  <AnimatePresence>
                    {isRejected && post.rejectionReason && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/80 dark:bg-red-950/30 p-4 backdrop-blur-sm"
                      >
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Reviewer Feedback</p>
                            <p className="text-sm text-red-700 dark:text-red-400 mt-1 leading-relaxed">{post.rejectionReason}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Re-approval Notice for Published Posts */}
                  {isPublished && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-950/30 p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">About Editing Published Posts</p>
                          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                            Your current article remains live while we review your changes. Once approved, the updated version will replace it automatically.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    {post.submittedAt && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-500 bg-white/60 dark:bg-slate-800/60 px-3 py-1.5 rounded-full">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Submitted: {new Date(post.submittedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {post.viewCount !== undefined && post.viewCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-500 bg-white/60 dark:bg-slate-800/60 px-3 py-1.5 rounded-full">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{post.viewCount.toLocaleString()} views</span>
                      </div>
                    )}
                    {post.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-500 bg-white/60 dark:bg-slate-800/60 px-3 py-1.5 rounded-full">
                        <Tag className="h-3.5 w-3.5" />
                        <span>{post.tags.length} tags</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Blog Submission Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm dark:border dark:border-slate-800">
                <CardHeader className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white rounded-t-lg relative overflow-hidden">
                  {/* Decorative pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                  </div>
                  <div className="relative flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Edit3 className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold">Edit Your Article</CardTitle>
                      <CardDescription className="text-emerald-100 mt-1">
                        Make changes and resubmit for review
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <BlogSubmissionForm
                    onSubmit={handleUpdate}
                    loading={saving}
                    currentUser={currentUser || undefined}
                    initialData={initialData}
                    mode="edit"
                    submitLabel={isPublished ? "Save & Submit for Review" : isPending ? "Update Submission" : "Save Changes"}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-6">
              {/* Quick Tips */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden dark:border dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-slate-100">
                      <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                        <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      Quick Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      'Keep your title clear and engaging',
                      'Use headings to structure your content',
                      'Add a compelling featured image',
                      'Include relevant tags for discoverability',
                      'Proofread before submitting',
                    ].map((tip, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="flex items-start gap-2 text-sm"
                      >
                        <div className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-slate-400">{tip}</span>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Review Process */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden dark:border dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-slate-100">
                      <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                        <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Review Process
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { step: 1, label: 'Submit your changes', color: 'emerald' },
                      { step: 2, label: 'Editorial review (24-48 hrs)', color: 'blue' },
                      { step: 3, label: 'Receive email notification', color: 'amber' },
                      { step: 4, label: 'Updates go live if approved', color: 'green' },
                    ].map((item, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <Badge 
                          variant="outline" 
                          className={`
                            ${item.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' : ''}
                            ${item.color === 'blue' ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30' : ''}
                            ${item.color === 'amber' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' : ''}
                            ${item.color === 'green' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30' : ''}
                            text-xs font-semibold
                          `}
                        >
                          Step {item.step}
                        </Badge>
                        <span className="text-sm text-gray-600 dark:text-slate-400">{item.label}</span>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Help Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden">
                  <CardContent className="p-5 relative">
                    {/* Decorative */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                    
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-5 w-5" />
                        <h4 className="font-semibold">Need Help?</h4>
                      </div>
                      <p className="text-sm text-emerald-100 mb-4">
                        Our support team is here to help you create amazing content.
                      </p>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                        onClick={() => router.push('/contact')}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Contact Support
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
