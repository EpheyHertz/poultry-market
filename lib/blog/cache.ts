import { revalidateTag, unstable_cache } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { getBlogPosts, type GetPostsParams, type GetPostsResult } from './get-posts';

export const BLOG_LIST_TAG = 'blog:listing';
export const BLOG_SITEMAP_TAG = 'blog:sitemap';
export const BLOG_FEED_TAG = 'blog:feed';
export const MAIN_SITEMAP_TAG = 'sitemap:main';

const PUBLIC_CACHE_SECONDS = 300;

export function blogPostTag(slug: string): string {
  return `blog:post:${slug}`;
}

export function blogAuthorTag(username: string): string {
  return `blog:author:${username.toLowerCase()}`;
}

export function getCachedBlogPosts(params: GetPostsParams = {}): Promise<GetPostsResult> {
  const key = JSON.stringify(params);
  return unstable_cache(
    () => getBlogPosts(params),
    ['blog-public-listing', key],
    { revalidate: PUBLIC_CACHE_SECONDS, tags: [BLOG_LIST_TAG] },
  )();
}

export const getCachedBlogSitemapPosts = unstable_cache(
  async () => prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      slug: true,
      updatedAt: true,
      author: { select: { name: true } },
      authorProfile: { select: { username: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  }),
  ['blog-sitemap-posts'],
  { revalidate: 3600, tags: [BLOG_SITEMAP_TAG] },
);

export const getCachedMainSitemapBlogPosts = unstable_cache(
  async () => prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      slug: true,
      updatedAt: true,
      author: { select: { name: true } },
      authorProfile: { select: { username: true } },
    },
    take: 2000,
  }),
  ['main-sitemap-blog-posts'],
  { revalidate: 3600, tags: [MAIN_SITEMAP_TAG, BLOG_SITEMAP_TAG] },
);

export const getCachedBlogFeedPosts = unstable_cache(
  async () => prisma.blogPost.findMany({
    where: { status: 'PUBLISHED', publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      publishedAt: true,
      updatedAt: true,
      author: { select: { name: true } },
      authorProfile: { select: { username: true } },
    },
  }),
  ['blog-feed-posts'],
  { revalidate: 3600, tags: [BLOG_FEED_TAG] },
);

export function invalidatePublicBlogCaches(slugs: string[] = []): void {
  for (const slug of new Set(slugs.filter(Boolean))) {
    revalidateTag(blogPostTag(slug), { expire: 0 });
  }

  revalidateTag(BLOG_LIST_TAG, { expire: 0 });
  revalidateTag(BLOG_SITEMAP_TAG, { expire: 0 });
  revalidateTag(BLOG_FEED_TAG, { expire: 0 });
  revalidateTag(MAIN_SITEMAP_TAG, { expire: 0 });
}

export function invalidatePublicAuthorCache(usernames: string[] = []): void {
  for (const username of new Set(usernames.filter(Boolean))) {
    revalidateTag(blogAuthorTag(username), { expire: 0 });
  }
}