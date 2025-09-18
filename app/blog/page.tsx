import { Suspense } from 'react';
import { generateBlogBreadcrumbData, generateBlogWebsiteData } from '@/components/blog/blog-seo';
import BlogContent from './blog-content';
import Head from 'next/head';

export default function BlogPage() {
  // Generate structured data for the blog listing page
  const blogStructuredData = generateBlogWebsiteData();
  const breadcrumbData = generateBlogBreadcrumbData();

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([blogStructuredData, breadcrumbData])
          }}
        />
      </Head>

      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading blog content...</p>
          </div>
        </div>
      }>
        <BlogContent />
      </Suspense>
    </>
  );
}