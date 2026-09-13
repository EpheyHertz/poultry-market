import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { subscribe, type SubscribeState } from '@/lib/email/subscribers';

/**
 * POST /api/blog/subscribe
 *
 * Double opt-in subscribe. Collects name + email + tickable topics + sending
 * frequency, then hands off to the `subscribe()` state machine which:
 *   - normalises the email and rejects obvious garbage
 *   - creates (or reuses) a PENDING subscriber
 *   - sends a hashed, single-use, expiring verification link
 *   - enforces a resend cooldown and a hard attempt cap
 *
 * The response always carries a `state` + human `message`, so the UI never has
 * to surface a raw status code like "409".
 */

const subscribeSchema = z.object({
  email: z.string().min(3).max(254),
  name: z.string().max(100).optional().nullable(),
  topics: z.array(z.string()).max(20).optional(),
  allTopics: z.boolean().optional(),
  frequency: z.string().optional(),
  source: z.string().max(60).optional(),
  // Honeypot: real users never fill this hidden field.
  company: z.string().optional(),
});

/** Maps a subscribe state to the most appropriate HTTP status code. */
function statusForState(state: SubscribeState): number {
  switch (state) {
    case 'verification_sent':
    case 'verification_resent':
    case 'already_active':
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
  // Per-IP throttle in front of the per-address cooldown inside subscribe().
  const identifier = getClientIdentifier(request);
  const limit = checkRateLimit(`newsletter:subscribe:${identifier}`, RATE_LIMITS.newsletterSubscribe);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        state: 'cooldown',
        message: 'You are trying a little too often. Please wait a moment and try again.',
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

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        state: 'invalid_email',
        message: 'Please check the details you entered and try again.',
      },
      { status: 400 }
    );
  }

  // Silently accept the honeypot so bots think they succeeded.
  if (parsed.data.company && parsed.data.company.trim().length > 0) {
    return NextResponse.json(
      {
        ok: true,
        state: 'verification_sent',
        message: 'Check your inbox for the confirmation link.',
      },
      { status: 200 }
    );
  }

  const result = await subscribe({
    email: parsed.data.email,
    name: parsed.data.name ?? undefined,
    topics: parsed.data.topics,
    allTopics: parsed.data.allTopics,
    frequency: parsed.data.frequency,
    source: parsed.data.source ?? 'blog',
    ip: identifier,
    userAgent: request.headers.get('user-agent'),
  });

  const status = statusForState(result.state);
  const headers: Record<string, string> = {};
  if (result.retryAfterSeconds && (status === 429)) {
    headers['Retry-After'] = String(result.retryAfterSeconds);
  }

  return NextResponse.json(result, { status, headers });
}
