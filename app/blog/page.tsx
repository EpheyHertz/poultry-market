import { Suspense } from 'react';
import { Metadata } from 'next';
import PublicNavbar from '@/components/layout/public-navbar';
import BlogHome from './blog-home';
import { getBlogPosts } from '@/lib/blog/get-posts';
import { BLOG_PAGE_SIZE, FEATURED_LIMIT } from '@/lib/blog/listing-config';
import { SITE_URL } from '@/lib/seo';
import AdsenseScript from '@/components/ads';

// ISR: revalidate every 5 minutes
export const revalidate = 300;

interface BlogPageProps {
  /** Next.js 15+ passes searchParams as a Promise — it must be awaited. */
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const resolved = await searchParams;
  const page = Math.max(1, parseInt(resolved?.page || '1', 10) || 1);
  const category = resolved?.category;

  // Per-page canonical URL
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (category) params.set('category', category);
  const query = params.toString();
  const canonicalPath = query ? `/blog?${query}` : '/blog';

  return {
    title: page > 1
      ? `Poultry Blog - Page ${page}`
      : 'Poultry Blog - Expert Insights, Tips & Industry News',
    description:
      'Discover the latest insights, tips, and expert advice in the poultry industry. From farming techniques to market trends, stay informed with comprehensive guides and articles.',
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
    ],
    openGraph: {
      title: 'Poultry Blog - Expert Insights & Industry News',
      description:
        'Stay informed with the latest poultry industry insights, farming tips, and expert advice from professionals.',
      type: 'website',
      url: `${SITE_URL}${canonicalPath}`,
      siteName: 'PoultryMarket Kenya',
      images: [
        {
          url: `${SITE_URL}/images/blog-og.jpg`,
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
      description:
        'Stay informed with the latest poultry industry insights, farming tips, and expert advice.',
      images: [`${SITE_URL}/images/blog-og.jpg`],
    },
    alternates: {
      canonical: `${SITE_URL}${canonicalPath}`,
      types: {
        'application/rss+xml': `${SITE_URL}/blog/feed.xml`,
        'application/atom+xml': `${SITE_URL}/blog/feed.xml`,
      },
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
}

function BlogLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Search bar skeleton */}
      <div className="sticky top-12 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 sm:top-16">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto h-10 max-w-md animate-pulse rounded-lg bg-gray-200 dark:bg-slate-800 sm:h-10"></div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Sidebar skeleton */}
          <div className="hidden space-y-4 lg:block">
            <div className="h-32 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-800"></div>
            <div className="h-48 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-800"></div>
          </div>

          {/* Posts skeleton */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-video animate-pulse rounded-lg bg-gray-200 dark:bg-slate-800"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  // Only server-render browse mode (no search query)
  const resolved = await searchParams;
  const page = Math.max(1, parseInt(resolved?.page || '1', 10) || 1);
  const category = resolved?.category || '';
  const search = resolved?.search || '';

  let initialPosts: any[] | null = null;
  let initialPagination: any | null = null;
  let initialFeatured: any[] | null = null;

  // Server-render the requested browse page; client handles search mode.
  //
  // Featured posts and the paginated listing are two independent queries:
  //  - Featured uses the `featured` DB flag so the rail is not limited to
  //    whatever happens to be on the current page.
  //  - The listing is a normal offset page, so ?page=N is crawlable and
  //    directly shareable.
  // They run in parallel to keep TTFB flat, and Promise.allSettled means a
  // failure in one never blanks the other.
  if (!search) {
    const [listResult, featuredResult] = await Promise.allSettled([
      getBlogPosts({ page, category, limit: BLOG_PAGE_SIZE }),
      getBlogPosts({ page: 1, featured: true, limit: FEATURED_LIMIT }),
    ]);

    if (listResult.status === 'fulfilled') {
      initialPosts = listResult.value.posts;
      initialPagination = listResult.value.pagination;
    } else {
      console.error('Error fetching blog posts:', listResult.reason);
      // Fall back to client-side fetch
    }

    if (featuredResult.status === 'fulfilled') {
      initialFeatured = featuredResult.value.posts;
    } else {
      console.error('Error fetching featured blog posts:', featuredResult.reason);
    }
  }

  // Generate structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'PoultryMarket Kenya Blog',
    description: 'Expert insights, tips, and advice for the poultry industry in Kenya.',
    url: `${SITE_URL}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'PoultryMarket Kenya',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/logo.png`,
      },
    },
    inLanguage: 'en-KE',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Poultry Market Kenya',
      url: SITE_URL,
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
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${SITE_URL}/blog`,
      },
    ],
  };

  // ItemList schema for rendered posts (SEO crawlability)
  const itemListSchema =
    initialPosts && initialPosts.length > 0
      ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        numberOfItems: initialPosts.length,
        itemListElement: initialPosts.map((post, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE_URL}/blog/${post.authorUsername || post.author?.username || post.author?.name?.replace(/\s+/g, '-').toLowerCase()}/${post.slug}`,
          name: post.title,
        })),
      }
      : null;

  return (
    <>
      <AdsenseScript />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}
      <PublicNavbar showAuth />
      <Suspense fallback={<BlogLoadingSkeleton />}>
        <BlogHome
          initialPosts={initialPosts}
          initialPagination={initialPagination}
          initialFeatured={initialFeatured}
        />
      </Suspense>
    </>
  );
}
