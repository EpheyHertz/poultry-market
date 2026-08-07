/**
 * GET /api/blog/search — v2 hybrid blog search (§8 contract).
 *
 * Query params (all optional except validation rules):
 *   q, cursor, limit, category, tag, author, featured, trending, popular,
 *   readingTime, dateFrom, dateTo, minViews, maxViews, minLikes, maxLikes,
 *   sort, debug
 *
 * Response envelope: { results, filters, suggestions, didYouMean,
 *   relatedSearches, nextCursor, totalResults, searchTimeMs, queryId, mode }
 *
 * Errors: 400 for validation failures, 429 for rate limiting.
 * Cache: no-store — results are personalized by cursor and analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { SearchService } from '@/lib/search-v2/SearchService';
import { SearchValidationError } from '@/lib/search-v2/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 1. Rate limit (public endpoint — keep generous but bounded)
  const identifier = getClientIdentifier(request);
  const rate = checkRateLimit(`blog-search-v2:${identifier}`, {
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

  // 2. Execute search (validation happens inside FilterService.parse)
  try {
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get('debug') === '1';

    const envelope = await SearchService.search(searchParams, debug);

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
    console.error('[api/blog/search] unexpected error:', err);
    return NextResponse.json(
      { error: 'Search temporarily unavailable. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
