import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { seoConfig, generateProductStructuredData, generateBreadcrumbStructuredData } from '@/lib/seo';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{
    slug: string;
  }>;
  children: React.ReactNode;
}

const productInclude = {
  seller: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
  reviews: {
    select: {
      rating: true,
    },
  },
  _count: {
    select: {
      reviews: true,
    },
  },
} as const;

async function findProduct(where: { slug?: string; id?: string }) {
  if (where.slug) {
    return prisma.product.findUnique({
      where: { slug: where.slug },
      include: productInclude,
    });
  } else if (where.id) {
    return prisma.product.findUnique({
      where: { id: where.id },
      include: productInclude,
    });
  }
  return null;
}

async function getProduct(identifier: string) {
  try {
    // Try by slug first
    let product = await findProduct({ slug: identifier });

    // Fallback to ID if slug lookup fails
    if (!product) {
      product = await findProduct({ id: identifier });
    }

    if (!product) return null;

    // Calculate average rating
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = product.reviews.length > 0 ? totalRating / product.reviews.length : 0;
    const canonicalSlug = product.slug || product.id;

    return {
      ...product,
      averageRating,
      reviewCount: product._count.reviews,
      canonicalSlug,
    };
  } catch (error) {
    console.error('Error fetching product for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
    };
  }

  const title = `${product.name} - ${product.type}`;
  const description = product.description.substring(0, 160) + '...';
  const imageUrl = product.images[0] || `${seoConfig.siteUrl}/images/default-product.jpg`;
  const url = `${seoConfig.siteUrl}/product/${product.canonicalSlug}`;
  const price = product.price;
  const currency = 'KES';
  const availability = product.stock > 0 ? 'in stock' : 'out of stock';

  return {
    title,
    description,
    keywords: [
      product.name,
      product.type,
      product.customType || '',
      product.seller?.name || '',
      'poultry',
      'Kenya',
      ...seoConfig.keywords.slice(0, 5),
    ].filter(Boolean),
    openGraph: {
      title,
      description,
      url,
      siteName: seoConfig.siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      locale: 'en_KE',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
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
    other: {
      'product:price:amount': price.toString(),
      'product:price:currency': currency,
      'product:availability': availability,
      'product:condition': 'new',
    },
  };
}

export default async function ProductLayout({ params, children }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // Generate structured data for SEO
  const productSchema = generateProductStructuredData({
    name: product.name,
    description: product.description,
    image: product.images[0] || '',
    price: product.price,
    inStock: product.stock > 0,
    averageRating: product.averageRating,
    reviewCount: product.reviewCount,
    category: product.type,
    brand: product.seller?.name,
    sku: product.id,
    store: product.seller,
    slug: product.canonicalSlug,
  });

  const breadcrumbSchema = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/products' },
    { name: product.type, url: `/products?type=${product.type}` },
    { name: product.name, url: `/product/${product.canonicalSlug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
