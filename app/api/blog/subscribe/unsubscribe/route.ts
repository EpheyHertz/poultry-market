import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import {
    unsubscribeByToken,
    resubscribeByToken,
    type UnsubscribeResult,
} from '@/lib/email/subscribers';

/**
 * POST /api/blog/subscribe/unsubscribe
 *
 * One-click unsubscribe (and one-click re-subscribe) driven by the manage
 * token. Both operations are idempotent and never error just because the
 * subscriber is already in the target state.
 *
 * Body: { token, action?: 'unsubscribe' | 'resubscribe', reason? }
 */

const schema = z.object({
    token: z.string().min(10).max(200),
    action: z.enum(['unsubscribe', 'resubscribe']).optional(),
    reason: z.string().max(500).optional(),
});

function statusForState(state: UnsubscribeResult['state']): number {
    switch (state) {
        case 'unsubscribed':
        case 'already_unsubscribed':
            return 200;
        case 'invalid':
            return 400;
        default:
            return 500;
    }
}

export async function POST(request: NextRequest) {
    const identifier = getClientIdentifier(request);
    const limit = checkRateLimit(`newsletter:unsub:${identifier}`, RATE_LIMITS.newsletterPreferences);
    if (!limit.allowed) {
        return NextResponse.json(
            { ok: false, state: 'error', message: 'Too many requests. Please try again shortly.' },
            { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } }
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { ok: false, state: 'invalid', message: 'This link is not valid.' },
            { status: 400 }
        );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, state: 'invalid', message: 'This link is not valid.' },
            { status: 400 }
        );
    }

    if (parsed.data.action === 'resubscribe') {
        const result = await resubscribeByToken(parsed.data.token);
        const status = result.state === 'updated' ? 200 : result.state === 'invalid' ? 400 : 500;
        return NextResponse.json(result, { status });
    }

    const result = await unsubscribeByToken(parsed.data.token, { reason: parsed.data.reason ?? null });
    return NextResponse.json(result, { status: statusForState(result.state) });
}
