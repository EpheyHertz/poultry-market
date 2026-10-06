import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { getCachedBlogSitemapPosts } from '@/lib/blog/cache';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  try {
    // Get all published blog posts with AuthorProfile data
    const posts = await getCachedBlogSitemapPosts();

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