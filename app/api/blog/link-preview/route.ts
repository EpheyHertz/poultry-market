/**
 * GET /api/blog/link-preview?url=... — Open Graph metadata for article links (§8).
 *
 * Used by the article MarkdownRenderer to upgrade bare URLs into rich cards.
 * The endpoint is deliberately forgiving: it never returns an error shape the
 * UI has to special-case. Unfetchable/unsafe URLs come back as a clean
 * "domain + open website" fallback payload (`resolved: false`) so the reader
 * never sees a broken card (§27).
 *
 * Safety: SSRF hardening lives in lib/blog/article/link-preview.ts
 * (http(s) only, no credentials, no private/loopback/link-local hosts,
 * capped redirects, 3s timeout, 512KB read cap).
 *
 * Caching: 24h in-memory LRU + `s-maxage=86400, stale-while-revalidate`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import {
    buildFallbackPreview,
    fetchLinkPreview,
    normalizePreviewUrl,
} from '@/lib/blog/article/link-preview';

const CACHE_HEADER = 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800';

export async function GET(request: NextRequest) {
    const rawUrl = request.nextUrl.searchParams.get('url')?.trim();

    if (!rawUrl) {
        return NextResponse.json(
            { error: 'A "url" query parameter is required.' },
            { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
    }

    if (rawUrl.length > 2048) {
        return NextResponse.json(
            { error: 'URL is too long.' },
            { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
    }

    // Reject unsafe targets before spending a rate-limit token.
    const normalized = normalizePreviewUrl(rawUrl);
    if (!normalized) {
        // Still hand back a renderable card so the client shows a tidy link.
        return NextResponse.json(buildFallbackPreview(rawUrl), {
            status: 200,
            headers: { 'Cache-Control': CACHE_HEADER },
        });
    }

    const identifier = getClientIdentifier(request);
    const rate = checkRateLimit(`blog-link-preview:${identifier}`, {
        maxRequests: 60,
        windowMs: 60 * 1000,
    });

    if (!rate.allowed) {
        // Degrade instead of failing: the reader gets the fallback card.
        return NextResponse.json(buildFallbackPreview(normalized.toString()), {
            status: 200,
            headers: {
                'Cache-Control': 'no-store',
                'Retry-After': String(rate.retryAfter ?? 60),
            },
        });
    }

    try {
        const preview = await fetchLinkPreview(normalized.toString());
        return NextResponse.json(preview, {
            status: 200,
            headers: { 'Cache-Control': CACHE_HEADER },
        });
    } catch (error) {
        console.error('[api/blog/link-preview] unexpected error:', error);
        return NextResponse.json(buildFallbackPreview(normalized.toString()), {
            status: 200,
            headers: { 'Cache-Control': 'public, max-age=60' },
        });
    }
}
