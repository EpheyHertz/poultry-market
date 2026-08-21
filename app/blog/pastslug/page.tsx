/**
 * Legacy article route (§25 — stable URLs).
 *
 * `/blog/pastslug` is a historical, author-less entry point. It no longer
 * renders an article of its own: the canonical location for every post is
 * `/blog/{authorUsername}/{slug}`, so this route now resolves the slug and
 * issues a permanent redirect. That keeps old links, bookmarks and any indexed
 * copies working while consolidating SEO signals onto one URL.
 *
 * The slug arrives as a query parameter (`/blog/pastslug?slug=my-article`);
 * anything we cannot resolve falls back to the blog index rather than a dead end.
 */


import { permanentRedirect, redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug?: string | string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PUBLIC_STATUSES = ['PUBLISHED', 'APPROVED'] as const;

/** URL-safe author segment, mirroring the canonical article route. */
const slugifyAuthorName = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const firstValue = (value?: string | string[] | null) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || null;

export const metadata = {
  title: 'Redirecting…',
  robots: { index: false, follow: true },
};

export default async function LegacyBlogPostRedirect({ params, searchParams }: Props) {
  const [resolvedParams, resolvedSearch] = await Promise.all([params, searchParams]);
  const slug = firstValue(resolvedParams?.slug) ?? firstValue(resolvedSearch?.slug);

  if (!slug) {
    redirect('/blog');
  }

  const post = await prisma.blogPost
    .findFirst({
      where: { slug, status: { in: [...PUBLIC_STATUSES] } },
      select: {
        slug: true,
        author: { select: { name: true } },
        authorProfile: { select: { username: true } },
      },
    })
    .catch((error) => {
      console.error('[blog/pastslug] lookup failed:', error);
      return null;
    });

  if (!post) {
    // Unknown or unpublished slug — send the reader somewhere useful instead
    // of a dead end, and keep the 404 signal off this legacy path.
    redirect('/blog');
  }

  const authorSegment =
    post.authorProfile?.username || slugifyAuthorName(post.author?.name ?? '') || 'author';

  permanentRedirect(`/blog/${authorSegment}/${post.slug}`);
}
