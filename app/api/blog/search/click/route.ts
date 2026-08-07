/**
 * POST /api/blog/search/click — search click attribution (§8, §12.7).
 *
 * Body (JSON):
 *   queryId      string (preferred)  — search_queries row id from envelope
 *   query        string (fallback)   — resolves newest matching search row
 *   postId       string (required)   — the clicked/opened post
 *   source       'results' | 'related' | 'didYouMean' (required)
 *   position     number (optional)   — 0-based position in results
 *   timeToClickMs number (optional)  — ms between render and click
 *
 * Response: { ok: true } — always 200 once validation passes; a missing
 * target row simply doesn't attribute (never an error state for the UI).
 *
 * Retention: search_queries rows are purged after 90 days (cron, Phase 8C).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { SearchAnalyticsService } from '@/lib/search-v2/SearchAnalyticsService';

export const dynamic = 'force-dynamic';

const clickSchema = z
  .object({
    queryId: z.string().uuid().optional(),
    query: z.string().min(1).max(200).optional(),
    postId: z.string().min(1).max(64),
    source: z.enum(['results', 'related', 'didYouMean']),
    position: z.number().int().min(0).max(500).optional(),
    timeToClickMs: z.number().int().min(0).max(3_600_000).optional(),
  })
  .refine((v) => v.queryId || v.query, {
    message: 'Either "queryId" or "query" is required',
  });

export async function POST(request: NextRequest) {
  // 1. Rate limit — clicks are user-initiated and infrequent.
  const identifier = getClientIdentifier(request);
  const rate = checkRateLimit(`blog-search-click:${identifier}`, {
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

  // 2. Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const parsed = clickSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // 3. Attribute (errors are swallowed — analytics never breaks the UI)
  await SearchAnalyticsService.recordClick(parsed.data);

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
