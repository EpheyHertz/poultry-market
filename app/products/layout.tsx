import { Metadata } from 'next';
import { seoConfig } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Shop Poultry Products - Quality Birds, Feed & Equipment',
  description: 'Browse our extensive collection of quality poultry products. Find chickens, ducks, turkeys, feed, equipment, and more from verified sellers across Kenya.',
  keywords: [
    'poultry products',
    'buy chickens Kenya',
    'poultry feed',
    'poultry equipment',
    'live birds',
    'poultry marketplace',
    'farm supplies',
    'poultry Kenya',
    ...seoConfig.keywords,
  ],
  openGraph: {
    title: 'Shop Poultry Products - Quality Birds, Feed & Equipment',
    description: 'Browse our extensive collection of quality poultry products from verified sellers across Kenya.',
    url: `${seoConfig.siteUrl}/products`,
    siteName: seoConfig.siteName,
    images: [
      {
        url: `${seoConfig.siteUrl}/images/products-og.jpg`,
        width: 1200,
        height: 630,
        alt: 'PoultryMarket Kenya Products',
      },
    ],
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop Poultry Products - Quality Birds, Feed & Equipment',
    description: 'Browse our extensive collection of quality poultry products from verified sellers across Kenya.',
    images: [`${seoConfig.siteUrl}/images/products-og.jpg`],
  },
  alternates: {
    canonical: `${seoConfig.siteUrl}/products`,
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

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Generate structured data for products page
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Poultry Products',
    description: 'Browse our extensive collection of quality poultry products from verified sellers across Kenya.',
    url: `${seoConfig.siteUrl}/products`,
    isPartOf: {
      '@type': 'WebSite',
      name: seoConfig.siteName,
      url: seoConfig.siteUrl,
    },
    breadcrumb: {
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
          name: 'Products',
          item: `${seoConfig.siteUrl}/products`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {children}
    </>
  );
}
