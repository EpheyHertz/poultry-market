/**
 * GET /api/blogs/search
 *
 * Keyword search across published blogs.
 *
 * Query params:
 *   q     (required) — search query
 *   limit (optional) — default 10, max 20
 *
 * Auth: Bearer <POULTRY_MARKET_API_KEY>
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateExternalApiKey } from '@/lib/search/auth';
import { keywordSearchSchema } from '@/lib/search/validation';
import { searchService } from '@/lib/search';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 1. Authenticate
  const authError = validateExternalApiKey(request);
  if (authError) return authError;

  // 2. Rate limit
  const identifier = getClientIdentifier(request);
  const rate = checkRateLimit(`blogs-search:${identifier}`, {
    maxRequests: 60,
    windowMs: 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfter ?? 60),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  // 3. Validate input
  const { searchParams } = new URL(request.url);
  const parsed = keywordSearchSchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { q, limit } = parsed.data;

  // 4. Execute search
  try {
    const results = await searchService.searchBlogs({ query: q, limit });

    return NextResponse.json(
      {
        data: results,
        meta: {
          query: q,
          count: results.length,
          limit,
        },
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': String(rate.remaining),
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/blogs/search] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
