/**
 * GET /api/blog/{slug}/related — related posts (§7, §8).
 *
 * Query params:
 *   limit (optional) — 1..12, default 6
 *
 * Response: { relatedPosts: [{ id, slug, title, excerpt, category,
 *   publishedAt, thumbnail, featuredImage, readingTime, views, likes,
 *   author, relationshipScore, reasons[] }], engine, relatedTimeMs }
 *
 * Errors: 400 bad limit, 404 unknown/non-public post, 429 rate limited.
 * Caching: the service caches per slug:limit for ttls.relatedSec (10 min
 * default); the route itself is no-store (TTL handled server-side).
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { RelatedPostsService } from '@/lib/search-v2/RelatedPostsService';
import { SearchValidationError } from '@/lib/search-v2/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const identifier = getClientIdentifier(request);
  const rate = checkRateLimit(`blog-related:${identifier}`, {
    maxRequests: 30,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfter ?? 60),
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  try {
    const { slug } = await params;

    let limit: number | undefined;
    const rawLimit = new URL(request.url).searchParams.get('limit');
    if (rawLimit !== null) {
      const parsed = Number(rawLimit);
      if (!Number.isFinite(parsed)) {
        throw new SearchValidationError('"limit" must be a number');
      }
      limit = parsed;
    }

    const envelope = await RelatedPostsService.findRelated(slug, limit);

    return NextResponse.json(envelope, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof SearchValidationError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    console.error('[api/blog/{slug}/related] unexpected error:', err);
    return NextResponse.json(
      { error: 'Related posts temporarily unavailable. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
