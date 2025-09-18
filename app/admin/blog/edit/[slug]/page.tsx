'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import BlogEditor from '@/components/blog/blog-editor';
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
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<Partial<BlogPostData> | undefined>();
  const [fetchLoading, setFetchLoading] = useState(true);

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
      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('Failed to load blog post');
        router.push('/admin/blog');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchPost();
  }, [resolvedParams.slug, router]);

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
          ? 'Post updated and published successfully!' 
          : 'Post updated successfully!'
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

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading blog post...</p>
        </div>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Blog post not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <BlogEditor
        initialData={initialData}
        onSave={handleSave}
        onCancel={handleCancel}
        isEditing={true}
        loading={loading}
      />
    </div>
  );
}