import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { resendVerification, type ResendResult } from '@/lib/email/subscribers';

/**
 * POST /api/blog/subscribe/resend
 *
 * Re-sends a pending verification link. Deliberately never reveals whether an
 * address is on the list (neutral response for unknown addresses) and is
 * bounded by both a per-IP throttle and the per-address cooldown enforced
 * inside `resendVerification()`.
 */

const resendSchema = z.object({
    email: z.string().min(3).max(254),
});

function statusForState(state: ResendResult['state']): number {
    switch (state) {
        case 'verification_resent':
        case 'already_active':
        case 'not_found':
            return 200;
        case 'invalid_email':
            return 400;
        case 'cooldown':
        case 'too_many_attempts':
            return 429;
        case 'send_failed':
            return 502;
        default:
            return 500;
    }
}

export async function POST(request: NextRequest) {
    const identifier = getClientIdentifier(request);
    const limit = checkRateLimit(`newsletter:resend:${identifier}`, RATE_LIMITS.newsletterResend);
    if (!limit.allowed) {
        return NextResponse.json(
            {
                ok: false,
                state: 'cooldown',
                message: 'Please wait a moment before requesting another email.',
                retryAfterSeconds: limit.retryAfter,
            },
            { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } }
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { ok: false, state: 'error', message: 'We could not read your request. Please try again.' },
            { status: 400 }
        );
    }

    const parsed = resendSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, state: 'invalid_email', message: 'Please enter a valid email address.' },
            { status: 400 }
        );
    }

    const result = await resendVerification(parsed.data.email);
    const status = statusForState(result.state);
    const headers: Record<string, string> = {};
    if (result.retryAfterSeconds && status === 429) {
        headers['Retry-After'] = String(result.retryAfterSeconds);
    }

    return NextResponse.json(result, { status, headers });
}
