import { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo';

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
  ],
  openGraph: {
    title: 'Shop Poultry Products - Quality Birds, Feed & Equipment',
    description: 'Browse our extensive collection of quality poultry products from verified sellers across Kenya.',
    url: `${SITE_URL}/products`,
    siteName: 'PoultryMarket Kenya',
    images: [
      {
        url: `${SITE_URL}/images/products-og.jpg`,
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
    images: [`${SITE_URL}/images/products-og.jpg`],
  },
  alternates: {
    canonical: `${SITE_URL}/products`,
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
    url: `${SITE_URL}/products`,
    isPartOf: {
      '@type': 'WebSite',
      name:"Poultry Market Kenya",
      url: SITE_URL,
    },
    breadcrumb: {
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
          name: 'Products',
          item: `${SITE_URL}/products`,
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
