/**
 * POST /api/author/resources/preview — validate a URL and read its metadata (§5, §7).
 *
 * Used only by the author dashboard while composing a recommended resource:
 * the author pastes a link, we confirm it is safe, then pre-fill the title,
 * description and image so they rarely have to type anything (§1).
 *
 * Why this is not an open proxy (§4):
 *   - it requires an authenticated user who owns an author profile
 *   - it is rate limited per user
 *   - it only ever returns parsed metadata, never the raw response body
 *   - the URL is validated *before* any network call, and again on every
 *     redirect hop inside `fetchLinkPreview`
 *
 * Fetching is delegated to `lib/blog/article/link-preview.ts` — the same
 * hardened fetcher the article link cards use (§16: extend, don't duplicate).
 * That gives us http(s)-only, no credentials, no private/loopback hosts,
 * capped redirects, a short timeout, a 512KB read cap and a 24h cache for free.
 *
 * Failure to read metadata is *not* an error (§7): the author can always type
 * the details in manually, so we return `resolved: false` and let the UI say so.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { fetchLinkPreview, normalizePreviewUrl } from '@/lib/blog/article/link-preview';
import {
    RESOURCE_LIMITS,
    identifyMerchant,
    normalizeResourceText,
    validateResourceImageUrl,
    validateResourceUrl,
} from '@/lib/author-resources';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export interface ResourcePreviewResponse {
    /** The destination we will store — affiliate params preserved verbatim (§21). */
    url: string;
    domain: string;
    /** Identified merchant, or `null` so the UI shows the domain (§9). */
    merchant: string | null;
    /** Suggested values, all optional — the author stays in control (§7, §20). */
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    /** `false` when the site gave us nothing useful; the author types it in. */
    resolved: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
        }

        // Only authors may probe URLs — this is what keeps the endpoint from
        // becoming a general-purpose fetching proxy (§4, §18).
        const profile = await prisma.authorProfile.findUnique({
            where: { userId: user.id },
            select: { id: true },
        });

        if (!profile) {
            return NextResponse.json(
                { error: 'Create your author profile before adding recommended resources' },
                { status: 403, headers: NO_STORE },
            );
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400, headers: NO_STORE },
            );
        }

        const rawUrl = (body as { url?: unknown })?.url;

        // Validate before spending a rate-limit token or touching the network.
        const destination = validateResourceUrl(rawUrl);
        if (!destination.ok) {
            return NextResponse.json(
                { error: destination.error },
                { status: 400, headers: NO_STORE },
            );
        }

        // Metadata lookups are the expensive part, so the limit is per user
        // rather than per IP: one author cannot exhaust it for everyone (§18).
        const rate = checkRateLimit(`author-resource-preview:${user.id}`, {
            maxRequests: 20,
            windowMs: 60 * 1000,
        });

        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Too many link checks. Please wait a moment and try again.' },
                {
                    status: 429,
                    headers: { ...NO_STORE, 'Retry-After': String(rate.retryAfter ?? 60) },
                },
            );
        }

        const fallback: ResourcePreviewResponse = {
            url: destination.value.url,
            domain: destination.value.domain,
            merchant: destination.value.merchant,
            title: null,
            description: null,
            imageUrl: null,
            resolved: false,
        };

        // `normalizePreviewUrl` applies the fetcher's own safety rules and drops
        // tracking noise. We use its output *only* to look up metadata — never
        // as the stored destination, because it would strip affiliate tags (§21).
        const fetchTarget = normalizePreviewUrl(destination.value.url);
        if (!fetchTarget) {
            return NextResponse.json(fallback, { status: 200, headers: NO_STORE });
        }

        // Never throws by contract; still guarded below out of caution.
        const preview = await fetchLinkPreview(fetchTarget.toString());

        const title = normalizeResourceText(
            preview.title,
            'Title',
            RESOURCE_LIMITS.title,
        );
        const description = normalizeResourceText(
            preview.description,
            'Description',
            RESOURCE_LIMITS.description,
        );
        const image = validateResourceImageUrl(preview.image);

        const payload: ResourcePreviewResponse = {
            ...fallback,
            // A long og:title/description is a suggestion, not a hard failure —
            // truncate to our limit instead of rejecting the whole preview.
            title: title.ok ? title.value : truncate(preview.title, RESOURCE_LIMITS.title),
            description: description.ok
                ? description.value
                : truncate(preview.description, RESOURCE_LIMITS.description),
            // A hostile or malformed og:image is dropped rather than rendered (§19).
            imageUrl: image.ok ? image.value : null,
            // Prefer the merchant we recognise; fall back to og:site_name only
            // when it exists, so we never invent a name (§9).
            merchant: destination.value.merchant
                ?? identifyMerchant(fetchTarget.hostname)
                ?? siteName(preview.siteName),
            resolved: preview.resolved,
        };

        return NextResponse.json(payload, { status: 200, headers: NO_STORE });
    } catch (error) {
        console.error('[api/author/resources/preview] unexpected error:', error);
        return NextResponse.json(
            { error: 'Could not check that link. You can still enter the details manually.' },
            { status: 500, headers: NO_STORE },
        );
    }
}

/** Cap an over-long metadata string instead of discarding it. */
function truncate(value: string | null | undefined, max: number): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;
    return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

/** `og:site_name`, length-capped. Only used when we could not identify a merchant. */
function siteName(value: string | null | undefined): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length > 60) return null;
    return cleaned;
}
