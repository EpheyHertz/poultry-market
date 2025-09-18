import { Metadata } from 'next';

interface BlogPost {
  title: string;
  excerpt?: string;
  featuredImage?: string;
  publishedAt: string;
  author: {
    name: string;
  };
  category: string;
  tags: Array<{
    name: string;
  }>;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

interface BlogSEOProps {
  post?: BlogPost;
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

export function generateBlogMetadata({
  post,
  title,
  description,
  image,
  url,
  type = 'website'
}: BlogSEOProps): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poultrymarket.ke';
  
  // For individual blog posts
  if (post) {
    const postUrl = `${siteUrl}/blog/${post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const postTitle = post.ogTitle || post.title;
    const postDescription = post.metaDescription || post.ogDescription || post.excerpt || '';
    const postImage = post.ogImage || post.featuredImage || `${siteUrl}/images/blog-default.jpg`;
    const publishedTime = new Date(post.publishedAt).toISOString();
    
    return {
      title: `${postTitle} - Poultry Market KE Blog`,
      description: postDescription,
      authors: [{ name: post.author.name }],
      keywords: post.tags.map(tag => tag.name).join(', '),
      openGraph: {
        type: 'article',
        title: postTitle,
        description: postDescription,
        url: postUrl,
        images: [
          {
            url: postImage,
            width: 1200,
            height: 630,
            alt: postTitle,
          }
        ],
        publishedTime,
        authors: [post.author.name],
        section: post.category.replace('_', ' '),
        tags: post.tags.map(tag => tag.name),
        siteName: 'Poultry Market KE',
      },
      twitter: {
        card: 'summary_large_image',
        title: post.twitterTitle || postTitle,
        description: post.twitterDescription || postDescription,
        images: [post.twitterImage || postImage],
        creator: '@PoultryMarketKE',
        site: '@PoultryMarketKE',
      },
      alternates: {
        canonical: postUrl,
      },
      other: {
        'article:published_time': publishedTime,
        'article:author': post.author.name,
        'article:section': post.category.replace('_', ' '),
        'article:tag': post.tags.map(tag => tag.name).join(','),
      }
    };
  }
  
  // For blog listing and other pages
  const pageTitle = title || 'Blog - Poultry Market KE';
  const pageDescription = description || 'Discover expert tips, industry insights, and success stories from Kenya\'s leading poultry marketplace. Learn about farming techniques, health management, nutrition, and market trends.';
  const pageImage = image || `${siteUrl}/images/blog-hero.jpg`;
  const pageUrl = url || `${siteUrl}/blog`;
  
  return {
    title: pageTitle,
    description: pageDescription,
    keywords: 'poultry farming, chicken farming, eggs, feed, nutrition, Kenya agriculture, farming tips, poultry health, market trends',
    openGraph: {
      type,
      title: pageTitle,
      description: pageDescription,
      url: pageUrl,
      images: [
        {
          url: pageImage,
          width: 1200,
          height: 630,
          alt: pageTitle,
        }
      ],
      siteName: 'Poultry Market KE',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: [pageImage],
      creator: '@PoultryMarketKE',
      site: '@PoultryMarketKE',
    },
    alternates: {
      canonical: pageUrl,
    }
  };
}

// JSON-LD Structured Data
export function generateBlogStructuredData(post: BlogPost, postSlug: string) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poultrymarket.ke';
  const postUrl = `${siteUrl}/blog/${postSlug}`;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.metaDescription || '',
    image: post.featuredImage || `${siteUrl}/images/blog-default.jpg`,
    author: {
      '@type': 'Person',
      name: post.author.name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Poultry Market KE',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/images/logo.png`,
      },
    },
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: new Date(post.publishedAt).toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    url: postUrl,
    articleSection: post.category.replace('_', ' '),
    keywords: post.tags.map(tag => tag.name),
    about: {
      '@type': 'Thing',
      name: 'Poultry Farming',
    },
    isPartOf: {
      '@type': 'Blog',
      name: 'Poultry Market KE Blog',
      url: `${siteUrl}/blog`,
    },
  };
}

// Breadcrumb Structured Data
export function generateBlogBreadcrumbData(post?: BlogPost, postSlug?: string) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poultrymarket.ke';
  
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: siteUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Blog',
      item: `${siteUrl}/blog`,
    },
  ];
  
  if (post && postSlug) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: post.title,
      item: `${siteUrl}/blog/${postSlug}`,
    });
  }
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };
}

// Website Structured Data for Blog
export function generateBlogWebsiteData() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poultrymarket.ke';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Poultry Market KE Blog',
    url: `${siteUrl}/blog`,
    description: 'Expert poultry farming tips, industry insights, and success stories from Kenya\'s leading poultry marketplace.',
    publisher: {
      '@type': 'Organization',
      name: 'Poultry Market KE',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/images/logo.png`,
      },
      sameAs: [
        'https://www.facebook.com/PoultryMarketKE',
        'https://twitter.com/PoultryMarketKE',
        'https://www.linkedin.com/company/poultrymarket-ke',
      ],
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/blog?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}