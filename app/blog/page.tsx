import { Suspense } from 'react';
import { Metadata } from 'next';
import PublicNavbar from '@/components/layout/public-navbar';
import MobileBlogContent from './mobile-blog-content';

export const metadata: Metadata = {
  title: 'Blog | PoultryHub - Expert Insights & Industry News',
  description: 'Discover the latest insights, tips, and expert advice in the poultry industry. From farming techniques to market trends, stay informed with PoultryHub Blog.',
  keywords: 'poultry blog, farming tips, poultry health, feed nutrition, market trends, industry news',
  openGraph: {
    title: 'PoultryHub Blog - Expert Insights & Industry News',
    description: 'Stay informed with the latest poultry industry insights, farming tips, and expert advice.',
    type: 'website',
    url: '/blog'
  }
};

function BlogLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Skeleton */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 animate-pulse">
        <div className="px-4 py-8 sm:px-6 sm:py-12">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="h-8 bg-emerald-400 rounded mx-auto w-48"></div>
            <div className="h-4 bg-emerald-400 rounded mx-auto w-64"></div>
            <div className="h-10 bg-white rounded mx-auto max-w-md"></div>
          </div>
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:block space-y-4">
            <div className="bg-gray-200 rounded-lg h-32 animate-pulse"></div>
            <div className="bg-gray-200 rounded-lg h-48 animate-pulse"></div>
          </div>
          
          {/* Posts Skeleton */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg aspect-video animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BlogPage() {
  return (
    <>
      <PublicNavbar showAuth />
      <Suspense fallback={<BlogLoadingSkeleton />}>
        <MobileBlogContent />
      </Suspense>
    </>
  );
}