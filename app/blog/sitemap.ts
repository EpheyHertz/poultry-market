import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://poultrymarket.co.ke';

  try {
    // Get all published blog posts
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get all unique categories and tags
    const categories = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        category: { not: null as any },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    });

    const tags = await prisma.blogTag.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    const blogRoutes: MetadataRoute.Sitemap = [
      // Main blog page
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      },
    ];

    // Individual blog posts
    const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Category pages
    const categoryRoutes: MetadataRoute.Sitemap = categories
      .filter((item) => item.category)
      .map((item) => ({
        url: `${baseUrl}/blog?category=${item.category}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));

    // Tag pages
    const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
      url: `${baseUrl}/blog?tag=${tag.slug}`,
      lastModified: tag.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

    return [
      ...blogRoutes,
      ...postRoutes,
      ...categoryRoutes,
      ...tagRoutes,
    ];
  } catch (error) {
    console.error('Error generating blog sitemap:', error);
    
    // Return at least the main blog page if database fails
    return [
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      },
    ];
  }
}