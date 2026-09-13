import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { verifySubscription, type VerifyResult } from '@/lib/email/subscribers';

/**
 * POST /api/blog/subscribe/verify
 *
 * Confirms a double opt-in subscription from the token embedded in the
 * verification email. Activating a subscriber is idempotent: clicking the same
 * link twice returns `already_verified` rather than an error.
 */

const verifySchema = z.object({
    token: z.string().min(10).max(200),
});

function statusForState(state: VerifyResult['state']): number {
    switch (state) {
        case 'verified':
        case 'already_verified':
            return 200;
        case 'expired':
        case 'invalid':
            return 400;
        default:
            return 500;
    }
}

export async function POST(request: NextRequest) {
    const identifier = getClientIdentifier(request);
    const limit = checkRateLimit(`newsletter:verify:${identifier}`, RATE_LIMITS.newsletterVerify);
    if (!limit.allowed) {
        return NextResponse.json(
            {
                ok: false,
                state: 'error',
                message: 'Too many attempts. Please wait a moment and try again.',
            },
            { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } }
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { ok: false, state: 'invalid', message: 'This confirmation link is not valid.' },
            { status: 400 }
        );
    }

    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, state: 'invalid', message: 'This confirmation link is not valid.' },
            { status: 400 }
        );
    }

    const result = await verifySubscription(parsed.data.token);
    return NextResponse.json(result, { status: statusForState(result.state) });
}
