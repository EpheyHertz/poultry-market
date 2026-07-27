/**
 * POST /api/external/blogs/search/semantic
 *
 * Semantic search for AI agents.
 *
 * Body:
 *   { "query": "...", "limit": 5 }
 *
 * Auth: Bearer <POULTRY_MARKET_API_KEY>
 *
 * The underlying ranking is a lightweight term-frequency scorer today.
 * It is designed to be replaced by pgvector / Pinecone later by swapping
 * the scoring function inside SearchService.semanticSearch().
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateExternalApiKey } from '@/lib/search/auth';
import { semanticSearchSchema } from '@/lib/search/validation';
import { searchService } from '@/lib/search';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const authError = validateExternalApiKey(request);
  if (authError) return authError;

  // 2. Rate limit
  const identifier = getClientIdentifier(request);
  const rate = checkRateLimit(`blogs-semantic:${identifier}`, {
    maxRequests: 30,
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

  // 3. Parse & validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const parsed = semanticSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { query, limit } = parsed.data;

  // 4. Execute semantic search
  try {
    const results = await searchService.semanticSearch({ query, limit });

    return NextResponse.json(
      {
        data: results,
        meta: {
          query,
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
    console.error('[POST /api/external/blogs/search/semantic] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
