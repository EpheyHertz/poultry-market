import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import {
    getSubscriberByManageToken,
    toSubscriberSummary,
    updatePreferencesByToken,
} from '@/lib/email/subscribers';

/**
 * GET  /api/blog/subscribe/preferences?token=...  -> load current preferences
 * PUT  /api/blog/subscribe/preferences            -> save new preferences
 *
 * The manage token is a deterministic, hashed value mailed to the subscriber;
 * it proves ownership of the inbox without exposing the email address in the
 * URL or requiring a login.
 */

function throttle(request: NextRequest) {
    const identifier = getClientIdentifier(request);
    return checkRateLimit(`newsletter:prefs:${identifier}`, RATE_LIMITS.newsletterPreferences);
}

export async function GET(request: NextRequest) {
    const limit = throttle(request);
    if (!limit.allowed) {
        return NextResponse.json(
            { ok: false, state: 'error', message: 'Too many requests. Please try again shortly.' },
            { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } }
        );
    }

    const token = new URL(request.url).searchParams.get('token') ?? '';
    const subscriber = await getSubscriberByManageToken(token);

    if (!subscriber) {
        return NextResponse.json(
            { ok: false, state: 'invalid', message: 'This preferences link is not valid or has expired.' },
            { status: 400 }
        );
    }

    return NextResponse.json({ ok: true, state: 'loaded', subscriber: toSubscriberSummary(subscriber) });
}

const updateSchema = z.object({
    token: z.string().min(10).max(200),
    name: z.string().max(100).optional().nullable(),
    topics: z.array(z.string()).max(20).optional(),
    allTopics: z.boolean().optional(),
    frequency: z.string().optional(),
});

export async function PUT(request: NextRequest) {
    const limit = throttle(request);
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
            { ok: false, state: 'error', message: 'We could not read your request. Please try again.' },
            { status: 400 }
        );
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, state: 'invalid', message: 'Please check your selection and try again.' },
            { status: 400 }
        );
    }

    const result = await updatePreferencesByToken(parsed.data.token, {
        name: parsed.data.name ?? undefined,
        topics: parsed.data.topics,
        allTopics: parsed.data.allTopics,
        frequency: parsed.data.frequency,
    });

    const status = result.state === 'updated' ? 200 : result.state === 'invalid' ? 400 : 500;
    return NextResponse.json(result, { status });
}
