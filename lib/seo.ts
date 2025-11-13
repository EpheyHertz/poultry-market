// SEO Configuration for PoultryMarket Kenya
export const seoConfig = {
  defaultTitle: 'PoultryMarket Kenya - Fresh Poultry Products & Livestock Trading Platform',
  titleTemplate: '%s | PoultryMarket Kenya',
  defaultDescription: 'Kenya\'s leading online marketplace for fresh poultry products, livestock trading, and agricultural supplies. Connect with verified farmers, sellers, and buyers across Kenya. Quality guaranteed.',
  siteUrl: 'https://poultrymarketke.vercel.app',
  siteName: 'PoultryMarket Kenya',
  images: [
    {
      url: 'https://res.cloudinary.com/dgvslio7u/image/upload/v1734690503/poultry-marketplace/logo_hd2q5e.png',
      width: 1200,
      height: 630,
      alt: 'PoultryMarket Kenya - Fresh Poultry Products',
    },
  ],
  favicon: '/favicon.ico',
  themeColor: '#ea580c',
  manifest: '/site.webmanifest',
  keywords: [
    'poultry market kenya',
    'chicken suppliers kenya',
    'livestock trading',
    'poultry farmers kenya',
    'fresh chicken kenya',
    'poultry products',
    'agricultural marketplace',
    'farm to table kenya',
    'poultry wholesale',
    'chicken delivery kenya',
    'livestock platform',
    'agricultural trading',
    'kenya farmers market',
    'poultry business kenya',
    'organic chicken kenya'
  ],
  author: 'PoultryMarket Kenya Team',
  creator: 'PoultryMarket Kenya',
  publisher: 'PoultryMarket Kenya',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://poultrymarketke.vercel.app',
    siteName: 'PoultryMarket Kenya',
    title: 'PoultryMarket Kenya - Fresh Poultry Products & Livestock Trading Platform',
    description: 'Kenya\'s leading online marketplace for fresh poultry products, livestock trading, and agricultural supplies. Connect with verified farmers, sellers, and buyers across Kenya.',
    images: [
      {
        url: 'https://res.cloudinary.com/dgvslio7u/image/upload/v1734690503/poultry-marketplace/logo_hd2q5e.png',
        width: 1200,
        height: 630,
        alt: 'PoultryMarket Kenya',
      },
    ],
  },
  twitter: {
    handle: '@PoultryMarketKE',
    site: '@PoultryMarketKE',
    cardType: 'summary_large_image',
    title: 'PoultryMarket Kenya - Fresh Poultry Products & Livestock Trading',
    description: 'Kenya\'s leading online marketplace for fresh poultry products and livestock trading. Quality guaranteed.',
    images: ['https://res.cloudinary.com/dgvslio7u/image/upload/v1734690503/poultry-marketplace/logo_hd2q5e.png'],
  },
  verification: {
    google: 'IgPxvlBVBb5z9Qvfgv34KXZPyVNGQXGtI_XHOS7VMSo',
    yandex: 'your-yandex-verification-code',
    bing: 'your-bing-verification-code',
  },
  alternates: {
    canonical: 'https://poultrymarketke.vercel.app',
    languages: {
      'en-KE': 'https://poultrymarketke.vercel.app',
      'sw-KE': 'https://poultrymarketke.vercel.app/sw',
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const generatePageSEO = (
  title: string,
  description: string,
  path: string = '',
  image?: string,
  keywords?: string[]
) => {
  const url = `${seoConfig.siteUrl}${path}`;
  const pageKeywords = keywords ? [...seoConfig.keywords, ...keywords] : seoConfig.keywords;
  
  return {
    title: `${title} | ${seoConfig.siteName}`,
    description,
    keywords: pageKeywords.join(', '),
    canonical: url,
    openGraph: {
      ...seoConfig.openGraph,
      title: `${title} | ${seoConfig.siteName}`,
      description,
      url,
      images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : seoConfig.openGraph.images,
    },
    twitter: {
      ...seoConfig.twitter,
      title: `${title} | ${seoConfig.siteName}`,
      description,
      images: image ? [image] : seoConfig.twitter.images,
    },
  };
};

export const structuredData = {
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PoultryMarket Kenya',
    url: 'https://poultrymarketke.vercel.app',
    logo: 'https://res.cloudinary.com/dgvslio7u/image/upload/v1734690503/poultry-marketplace/logo_hd2q5e.png',
    description: 'Kenya\'s leading online marketplace for fresh poultry products, livestock trading, and agricultural supplies.',
    foundingDate: '2024',
    founders: [
      {
        '@type': 'Person',
        name: 'PoultryMarket Kenya Team',
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'Kenya',
      addressRegion: 'Nairobi',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+254-700-000-000',
      contactType: 'Customer Service',
      email: 'support@poultrymarketke.com',
    },
    sameAs: [
      'https://www.facebook.com/groups/4228746564014783/?ref=share&mibextid=NSMWBT',
      'https://chat.whatsapp.com/IbiitCQgb1KB4Aowo23nBQ',
    ],
  },
  
  website: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PoultryMarket Kenya',
    url: 'https://poultrymarketke.vercel.app',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://poultrymarketke.vercel.app/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
  
  marketplace: {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: 'PoultryMarket Kenya',
    url: 'https://poultrymarketke.vercel.app',
    description: 'Online marketplace for fresh poultry products and livestock trading in Kenya',
    image: 'https://res.cloudinary.com/dgvslio7u/image/upload/v1734690503/poultry-marketplace/logo_hd2q5e.png',
    priceRange: 'KES 500 - KES 50000',
    paymentAccepted: ['Cash', 'Credit Card', 'Bank Transfer', 'Mobile Money'],
    currenciesAccepted: 'KES',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'Kenya',
    },
  },
};

export const generateProductStructuredData = (product: any) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.images?.[0] || '/default-product.jpg',
  brand: {
    '@type': 'Brand',
    name: product.store?.name || 'PoultryMarket Kenya',
  },
  offers: {
    '@type': 'Offer',
    url: `https://poultrymarketke.vercel.app/product/${product.slug}`,
    priceCurrency: 'KES',
    price: product.price,
    availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    seller: {
      '@type': 'Organization',
      name: product.store?.name || 'PoultryMarket Kenya',
    },
  },
  aggregateRating: product.averageRating ? {
    '@type': 'AggregateRating',
    ratingValue: product.averageRating,
    reviewCount: product.reviewCount || 0,
  } : undefined,
});

export const generateBreadcrumbStructuredData = (items: Array<{ name: string; url?: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url ? `https://poultrymarketke.vercel.app${item.url}` : undefined,
  })),
});

export const generateBlogPostingStructuredData = (blog: {
  title: string;
  description: string;
  author: { name: string; url?: string };
  image?: string;
  publishedAt: string;
  updatedAt: string;
  url: string;
  keywords?: string;
  category?: string;
  wordCount?: number;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: blog.title,
  description: blog.description,
  image: blog.image || `${seoConfig.siteUrl}/images/default-blog.jpg`,
  author: {
    '@type': 'Person',
    name: blog.author.name,
    url: blog.author.url || seoConfig.siteUrl,
  },
  publisher: {
    '@type': 'Organization',
    name: seoConfig.siteName,
    logo: {
      '@type': 'ImageObject',
      url: `${seoConfig.siteUrl}/images/logo.png`,
    },
  },
  datePublished: blog.publishedAt,
  dateModified: blog.updatedAt,
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': blog.url,
  },
  keywords: blog.keywords,
  articleSection: blog.category,
  wordCount: blog.wordCount,
});
