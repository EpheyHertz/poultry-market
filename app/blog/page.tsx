import { Suspense } from 'react';
import { Metadata } from 'next';
import PublicNavbar from '@/components/layout/public-navbar';
import MobileBlogContent from './mobile-blog-content';
import { seoConfig } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Poultry Blog - Expert Insights, Tips & Industry News',
  description: 'Discover the latest insights, tips, and expert advice in the poultry industry. From farming techniques to market trends, stay informed with comprehensive guides and articles.',
  keywords: [
    'poultry blog',
    'farming tips',
    'poultry health',
    'feed nutrition',
    'market trends',
    'industry news',
    'poultry farming Kenya',
    'chicken farming tips',
    'poultry diseases',
    'poultry management',
    ...seoConfig.keywords.slice(0, 5),
  ],
  openGraph: {
    title: 'Poultry Blog - Expert Insights & Industry News',
    description: 'Stay informed with the latest poultry industry insights, farming tips, and expert advice from professionals.',
    type: 'website',
    url: `${seoConfig.siteUrl}/blog`,
    siteName: seoConfig.siteName,
    images: [
      {
        url: `${seoConfig.siteUrl}/images/blog-og.jpg`,
        width: 1200,
        height: 630,
        alt: 'PoultryMarket Kenya Blog',
      },
    ],
    locale: 'en_KE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Poultry Blog - Expert Insights & Industry News',
    description: 'Stay informed with the latest poultry industry insights, farming tips, and expert advice.',
    images: [`${seoConfig.siteUrl}/images/blog-og.jpg`],
  },
  alternates: {
    canonical: `${seoConfig.siteUrl}/blog`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

function BlogLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Hero Skeleton */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-800 animate-pulse">
        <div className="px-4 py-8 sm:px-6 sm:py-12">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="h-8 bg-emerald-400 dark:bg-emerald-500 rounded mx-auto w-48"></div>
            <div className="h-4 bg-emerald-400 dark:bg-emerald-500 rounded mx-auto w-64"></div>
            <div className="h-10 bg-white dark:bg-slate-800 rounded mx-auto max-w-md"></div>
          </div>
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:block space-y-4">
            <div className="bg-gray-200 dark:bg-slate-800 rounded-lg h-32 animate-pulse"></div>
            <div className="bg-gray-200 dark:bg-slate-800 rounded-lg h-48 animate-pulse"></div>
          </div>
          
          {/* Posts Skeleton */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 dark:bg-slate-800 rounded-lg aspect-video animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BlogPage() {
  // Generate structured data for blog page
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'PoultryMarket Kenya Blog',
    description: 'Expert insights, tips, and advice for the poultry industry in Kenya.',
    url: `${seoConfig.siteUrl}/blog`,
    publisher: {
      '@type': 'Organization',
      name: seoConfig.siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${seoConfig.siteUrl}/images/logo.png`,
      },
    },
    inLanguage: 'en-KE',
    isPartOf: {
      '@type': 'WebSite',
      name: seoConfig.siteName,
      url: seoConfig.siteUrl,
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: seoConfig.siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${seoConfig.siteUrl}/blog`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <PublicNavbar showAuth />
      <Suspense fallback={<BlogLoadingSkeleton />}>
        <MobileBlogContent />
      </Suspense>
    </>
  );
}