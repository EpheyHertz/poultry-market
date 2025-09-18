'use client';

import { useState } from 'react';
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

export default function NewBlogPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSave = async (data: BlogPostData) => {
    try {
      setLoading(true);

      const response = await fetch('/api/blog/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }

      const result = await response.json();
      
      toast.success(
        data.status === 'PUBLISHED' 
          ? 'Post published successfully!' 
          : 'Post saved as draft!'
      );

      // Redirect to edit page or blog list
      router.push(`/admin/blog/edit/${result.slug}`);
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/blog');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <BlogEditor
        onSave={handleSave}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  );
}