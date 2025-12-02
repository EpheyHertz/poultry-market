'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PublicNavbar from '@/components/layout/public-navbar';
import BlogSubmissionForm from '@/components/blog/blog-submission-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, FileText } from 'lucide-react';
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
    description: 'Our editors are reviewing your updates.',
    tone: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  REJECTED: {
    label: 'Needs Revisions',
    description: 'Address the review feedback below and resubmit.',
    tone: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
    icon: AlertCircle,
  },
  DRAFT: {
    label: 'Draft',
    description: 'Finish polishing your post before submitting for review.',
    tone: 'text-slate-700',
    badge: 'bg-gray-100 text-gray-800',
    icon: FileText,
  },
  APPROVED: {
    label: 'Published',
    description: 'Live for readers. Updates go back through review.',
    tone: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  PUBLISHED: {
    label: 'Published',
    description: 'Live for readers. Updates go back through review.',
    tone: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  ARCHIVED: {
    label: 'Archived',
    description: 'Hidden from readers. Contact support to restore.',
    tone: 'text-slate-700',
    badge: 'bg-slate-100 text-slate-800',
    icon: FileText,
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

      toast.success('Blog post updated successfully.');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600 mt-4">Loading your blog post...</p>
        </div>
      </div>
    );
  }

  if (!post || !initialData) {
    return null;
  }

  const StatusIcon = statusDetails?.icon ?? FileText;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      <PublicNavbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Button variant="ghost" className="w-fit gap-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back to My Blogs
          </Button>
          <Badge className={statusDetails?.badge}>{statusDetails?.label}</Badge>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Editing: {post.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-4 w-4 ${statusDetails?.tone}`} />
                  <span className={statusDetails?.tone}>{statusDetails?.description}</span>
                </div>
                {post.status === 'REJECTED' && post.rejectionReason && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-800">Reviewer feedback</p>
                    <p className="text-sm text-red-700 mt-1">{post.rejectionReason}</p>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Last submitted: {post.submittedAt ? new Date(post.submittedAt).toLocaleString() : 'Not submitted yet'}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <BlogSubmissionForm
            onSubmit={handleUpdate}
            loading={saving}
            currentUser={currentUser || undefined}
            initialData={initialData}
            mode="edit"
            submitLabel="Save & Resubmit"
          />
        </motion.div>
      </div>
    </div>
  );
}
