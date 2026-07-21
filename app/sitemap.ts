import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const now = new Date();

  // Static routes — only indexable, canonical, 200-status pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/market-prices`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  try {
    const [productsResult, categoriesResult, sellersResult, blogPostsResult, authorProfilesResult] =
      await Promise.allSettled([
        prisma.product.findMany({
          where: {
            isActive: true,
          },
          select: {
            slug: true,
            updatedAt: true,
          },
          take: 1000,
        }),
        prisma.category.findMany({
          select: {
            slug: true,
            updatedAt: true,
          },
        }),
        prisma.user.findMany({
          where: {
            role: 'SELLER',
            isVerified: true,
            dashboardSlug: {
              not: null,
            },
          },
          select: {
            dashboardSlug: true,
            updatedAt: true,
          },
          take: 500,
        }),
        prisma.blogPost.findMany({
          where: {
            status: 'PUBLISHED',
          },
          select: {
            slug: true,
            updatedAt: true,
            author: {
              select: {
                name: true,
              },
            },
            authorProfile: {
              select: {
                username: true,
              },
            },
          },
          take: 2000,
        }),
        prisma.authorProfile.findMany({
          where: {
            isPublic: true,
          },
          select: {
            username: true,
            updatedAt: true,
          },
          take: 500,
        }),
      ]);

    const productRoutes =
      productsResult.status === 'fulfilled'
        ? productsResult.value
            .filter((product) => product.slug)
            .map((product) => ({
              url: `${baseUrl}/product/${product.slug}`,
              lastModified: product.updatedAt,
              changeFrequency: 'weekly' as const,
              priority: 0.7,
            }))
        : [];

    const categoryRoutes =
      categoriesResult.status === 'fulfilled'
        ? categoriesResult.value
            .filter((category) => category.slug)
            .map((category) => ({
              url: `${baseUrl}/categories/${category.slug}`,
              lastModified: category.updatedAt,
              changeFrequency: 'weekly' as const,
              priority: 0.6,
            }))
        : [];

    const sellerRoutes =
      sellersResult.status === 'fulfilled'
        ? sellersResult.value
            .filter((seller) => seller.dashboardSlug)
            .map((seller) => ({
              url: `${baseUrl}/store/${seller.dashboardSlug}`,
              lastModified: seller.updatedAt,
              changeFrequency: 'weekly' as const,
              priority: 0.6,
            }))
        : [];

    const blogRoutes =
      blogPostsResult.status === 'fulfilled'
        ? blogPostsResult.value
            .filter(
              (post) => post.slug && (post.authorProfile?.username || post.author?.name)
            )
            .map((post) => {
              const authorPath =
                post.authorProfile?.username ||
                post.author?.name.replace(/\s+/g, '-').toLowerCase();
              return {
                url: `${baseUrl}/blog/${authorPath}/${post.slug}`,
                lastModified: post.updatedAt,
                changeFrequency: 'weekly' as const,
                priority: 0.7,
              };
            })
        : [];

    const authorRoutes =
      authorProfilesResult.status === 'fulfilled'
        ? authorProfilesResult.value
            .filter((profile) => profile.username)
            .map((profile) => ({
              url: `${baseUrl}/author/${profile.username}`,
              lastModified: profile.updatedAt,
              changeFrequency: 'weekly' as const,
              priority: 0.6,
            }))
        : [];

    return [
      ...staticRoutes,
      ...productRoutes,
      ...categoryRoutes,
      ...sellerRoutes,
      ...blogRoutes,
      ...authorRoutes,
    ];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return staticRoutes;
  }
}
