/**
 * GET /api/blog/search/suggest — typeahead / autocomplete (§6, §8).
 *
 * Query params:
 *   q      (required) — prefix, 1..200 chars
 *   limit  (optional) — 1..10, default 8
 *   sid    (optional) — client session id; enables "recent" suggestions
 *          scoped to this session only (privacy: never cross-session)
 *
 * Response: { suggestions: [{ text, type, count? }] }
 *   type ∈ title | tag | category | author | popular | trending | recent
 *
 * Errors: 400 for validation failures, 429 for rate limiting.
 * Cache: no-store (the service caches internally for ttls.autocompleteSec,
 * and results are personalized by recent search history).
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { SuggestionService } from '@/lib/search-v2/SuggestionService';
import { SearchValidationError } from '@/lib/search-v2/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 1. Rate limit — suggest is chatty (fires per keystroke), so allow a
  //    higher rate than results but keep it bounded.
  const identifier = getClientIdentifier(request);
  const rate = checkRateLimit(`blog-suggest:${identifier}`, {
    maxRequests: 60,
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

  // 2. Validate + serve
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    let limit: number | undefined;
    const rawLimit = searchParams.get('limit');
    if (rawLimit !== null) {
      const parsed = Number(rawLimit);
      if (!Number.isFinite(parsed)) {
        throw new SearchValidationError('"limit" must be a number');
      }
      limit = parsed;
    }

    // Optional session id for session-scoped "recent" suggestions.
    const sid = searchParams.get('sid') || undefined;

    const suggestions = await SuggestionService.suggest(q, limit, sid);

    return NextResponse.json(
      { suggestions },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    if (err instanceof SearchValidationError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    console.error('[api/blog/search/suggest] unexpected error:', err);
    return NextResponse.json(
      { error: 'Suggestions temporarily unavailable. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
