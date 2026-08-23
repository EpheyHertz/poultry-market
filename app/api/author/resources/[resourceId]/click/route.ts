/**
 * POST /api/author/resources/:id/click — count an outbound resource click (§22).
 *
 * This is intentionally tiny. Rich analytics still go through the existing
 * `trackEvent('affiliate_resource_click', ...)` call on the client; this
 * endpoint only bumps a counter so the author can see engagement in their own
 * dashboard without us standing up a second analytics pipeline.
 *
 * Deliberate choices:
 *   - public, because readers are not signed in
 *   - rate limited per client so the counter cannot be trivially inflated
 *   - stores no IP, user agent, referrer or any other personal data
 *   - never returns the destination URL, and never redirects, so affiliate
 *     attribution is untouched (§21) and no new indexable URL is created (§23)
 *   - responds 204 regardless of outcome: a failed count must never block or
 *     delay the reader's navigation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

type RouteContext = { params: Promise<{ resourceId: string }> };

const NO_CONTENT = { status: 204, headers: { 'Cache-Control': 'no-store' } } as const;

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { resourceId } = await context.params;

        if (!resourceId || resourceId.length > 64) {
            return new NextResponse(null, NO_CONTENT);
        }

        const identifier = getClientIdentifier(request);
        const rate = checkRateLimit(`author-resource-click:${identifier}`, {
            maxRequests: 30,
            windowMs: 60 * 1000,
        });

        if (!rate.allowed) {
            return new NextResponse(null, NO_CONTENT);
        }

        // `updateMany` so an unknown id is a no-op instead of throwing, and so a
        // caller cannot probe which ids exist from the status code.
        await prisma.authorResource.updateMany({
            where: { id: resourceId, isActive: true },
            data: { clickCount: { increment: 1 } },
        });

        return new NextResponse(null, NO_CONTENT);
    } catch (error) {
        // Swallowed on purpose — a broken counter must not break navigation.
        console.error('[api/author/resources/:id/click] failed:', error);
        return new NextResponse(null, NO_CONTENT);
    }
}
