/**
 * GET /api/blog/posts/related — legacy related-posts endpoint.
 *
 * Phase 4 (§7): this route now DELEGATES to RelatedPostsService (the v2
 * hybrid engine) while preserving its original response shape
 * `{ posts, total }` so existing consumers keep working. New clients should
 * use GET /api/blog/{slug}/related instead.
 *
 * Params (unchanged for backward compat):
 *   exclude  (required) — id of the post to find related content for
 *   category (ignored)  — kept for compat; the v2 engine derives category
 *                         similarity from the source post itself
 *   tags     (ignored)  — same as category
 *   limit    (optional) — default 3
 *
 * Fallback: if the source post is unknown or not public, returns the newest
 * public posts (the historical behavior for missing context).
 */

import { NextRequest, NextResponse } from 'next/server';
import { BlogPostCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { RelatedPostsService } from '@/lib/search-v2/RelatedPostsService';
import { SearchValidationError } from '@/lib/search-v2/types';

export const dynamic = 'force-dynamic';

const LEGACY_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  featuredImage: true,
  readingTime: true,
  estimatedReadTime: true,
  publishedAt: true,
  category: true,
  viewCount: true,
  likes: true,
  author: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
} as const;

/** Row shape produced by LEGACY_SELECT (enrichment + fallback queries). */
interface LegacyPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  readingTime: number | null;
  estimatedReadTime: number | null;
  publishedAt: Date | null;
  category: BlogPostCategory;
  viewCount: number;
  likes: number;
  author: { id: string; name: string; avatar: string | null };
  tags: { tag: { id: string; name: string; slug: string } }[];
}

function toLegacyShape(post: LegacyPostRow) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featuredImage: post.featuredImage,
    readingTime: post.estimatedReadTime ?? post.readingTime,
    publishedAt: post.publishedAt?.toISOString() || '',
    category: post.category,
    views: post.viewCount,
    likes: post.likes,
    author: {
      id: post.author.id,
      name: post.author.name,
      avatar: post.author.avatar,
    },
    tags: post.tags.map((tagRelation) => tagRelation.tag),
  };
}

export async function GET(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const rate = checkRateLimit(`blog-related-legacy:${identifier}`, {
    maxRequests: 30,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const exclude = searchParams.get('exclude');
    const limit = parseInt(searchParams.get('limit') || '3', 10);
    const effectiveLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 12) : 3;

    if (!exclude) {
      return NextResponse.json(
        { error: 'Post ID to exclude is required' },
        { status: 400 }
      );
    }

    // Delegate to the v2 engine: resolve source slug, then recommend.
    const source = await prisma.blogPost.findUnique({
      where: { id: exclude },
      select: { slug: true },
    });

    if (source) {
      try {
        const envelope = await RelatedPostsService.findRelated(
          source.slug,
          effectiveLimit
        );

        if (envelope.relatedPosts.length > 0) {
          // Enrich with author/tags in the legacy shape (one extra query).
          const ids = envelope.relatedPosts.map((p) => p.id);
          const enrichment = await prisma.blogPost.findMany({
            where: { id: { in: ids } },
            select: LEGACY_SELECT,
          });
          const byId = new Map(enrichment.map((p) => [p.id, p]));

          const posts = envelope.relatedPosts
            .map((p) => byId.get(p.id))
            .filter((p): p is LegacyPostRow => Boolean(p))
            .map(toLegacyShape);

          return NextResponse.json(
            { posts, total: posts.length },
            { headers: { 'Cache-Control': 'no-store' } },
          );
        }
      } catch (err) {
        // 404 from the service (post unpublished) → fall through to the
        // recent-posts fallback below; anything else is logged and falls
        // back too, so the legacy contract never degrades to an error page.
        if (!(err instanceof SearchValidationError)) {
          console.error('[api/blog/posts/related] v2 delegation error:', err);
        }
      }
    }

    // Fallback: newest public posts (historical behavior).
    const recentPosts = await prisma.blogPost.findMany({
      where: {
        id: { not: exclude },
        status: { in: ['PUBLISHED', 'APPROVED'] },
      },
      select: LEGACY_SELECT,
      orderBy: [{ publishedAt: 'desc' }],
      take: effectiveLimit,
    });

    const posts = recentPosts.map(toLegacyShape);
    return NextResponse.json(
      { posts, total: posts.length },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Error fetching related posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related posts' },
      { status: 500 }
    );
  }
}