import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  try {
    // Get all published blog posts with AuthorProfile data
    const posts = await prisma.blogPost.findMany({
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
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5000,
    });

    return posts
      .filter((post) => post.slug && (post.authorProfile?.username || post.author?.name))
      .map((post) => {
        const authorPath =
          post.authorProfile?.username ||
          post.author?.name.replace(/\s+/g, '-').toLowerCase();
        return {
          url: `${baseUrl}/blog/${authorPath}/${post.slug}`,
          lastModified: post.updatedAt,
        };
      });
  } catch (error) {
    console.error('Error generating blog sitemap:', error);
    return [];
  }
}