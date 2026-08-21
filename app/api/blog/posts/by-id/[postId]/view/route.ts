/**
 * Article view tracking (§12, §13).
 *
 * The client calls this endpoint only after meaningful engagement — a dwell
 * timer plus a scroll threshold — so a bare page load never counts as a view.
 * This handler adds the server-side guarantees:
 *
 *   • one counted view per reader per article (user id, else session cookie,
 *     else a salted IP+UA hash) so rapid refreshes cannot inflate the number;
 *   • the anonymous `view_session` cookie is actually issued here, which is what
 *     makes that dedupe work across refreshes and later visits;
 *   • repeat calls only *update* engagement (read duration, scroll depth,
 *     completion) instead of incrementing counters again;
 *   • privacy: no raw IP or user-agent is stored, only a truncated hash.
 *
 * Tracking failures are always swallowed — analytics must never break a page.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** Statuses a public reader can reach, so their views must be counted. */
const TRACKABLE_STATUSES = new Set(['PUBLISHED', 'APPROVED']);

const SESSION_COOKIE = 'view_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
/** Scroll depth (%) at which a view is considered a completed read. */
const COMPLETION_SCROLL_DEPTH = 80;

interface ViewPayload {
  readDuration?: number;
  scrollDepth?: number;
  referrer?: string;
}

/**
 * `navigator.sendBeacon` sends a Blob whose content-type is often `text/plain`,
 * which makes `request.json()` reject. Parse defensively so beacon-delivered
 * events (fired on tab close) are not silently dropped.
 */
async function readPayload(request: NextRequest): Promise<ViewPayload> {
  try {
    const raw = await request.text();
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as ViewPayload) : {};
  } catch {
    return {};
  }
}

/** Clamp to a sane integer range; ignore anything non-numeric or absurd. */
function toBoundedInt(value: unknown, max: number): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(Math.round(n), max);
}

function detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return 'mobile';
  return 'desktop';
}

/** Only keep the origin of the referrer — enough for reporting, no query strings. */
function sanitizeReferrer(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return null;
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return value.trim().slice(0, 300) || null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  let sessionId: string | null = null;
  let issueCookie = false;

  try {
    const { postId } = await params;

    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      select: { id: true, status: true, authorProfileId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (!TRACKABLE_STATUSES.has(String(post.status))) {
      return NextResponse.json({ tracked: false, reason: 'Post not public' });
    }

    const [user, payload] = await Promise.all([
      getCurrentUser().catch(() => null),
      readPayload(request),
    ]);

    const readDuration = toBoundedInt(payload.readDuration, 60 * 60 * 6);
    const scrollDepth = Math.min(toBoundedInt(payload.scrollDepth, 100) ?? 0, 100) || null;
    const referrer = sanitizeReferrer(payload.referrer);

    // Anonymous identity: reuse the existing cookie, otherwise mint one and
    // send it back so the next request from this reader dedupes correctly.
    sessionId = request.cookies.get(SESSION_COOKIE)?.value?.trim() || null;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      issueCookie = true;
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = (forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip')) || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    // Salted + truncated: not reversible to an IP, but stable enough to stop
    // refresh spam from a reader who blocks cookies (§12 privacy).
    const ipHash = crypto
      .createHash('sha256')
      .update(`${ip.trim()}|${userAgent}|${process.env.JWT_SECRET ?? 'pmk'}`)
      .digest('hex')
      .substring(0, 16);

    const deviceType = detectDeviceType(userAgent);

    // Dedupe: signed-in readers by user id, everyone else by session cookie,
    // with the IP hash as a fallback for a brand-new (cookie-less) session.
    const existingView = await prisma.blogPostView.findFirst({
      where: {
        postId,
        ...(user?.id
          ? { userId: user.id }
          : issueCookie
            ? { ipHash, userId: null }
            : { sessionId }),
      },
      select: { id: true, readDuration: true, scrollDepth: true, completedRead: true },
    });

    if (existingView) {
      // Known reader — enrich the existing row, never bump the counters.
      await prisma.blogPostView.update({
        where: { id: existingView.id },
        data: {
          readDuration: Math.max(existingView.readDuration ?? 0, readDuration ?? 0) || null,
          scrollDepth: Math.max(existingView.scrollDepth ?? 0, scrollDepth ?? 0) || null,
          completedRead:
            existingView.completedRead || (scrollDepth ?? 0) >= COMPLETION_SCROLL_DEPTH,
        },
      });

      return withSessionCookie(
        NextResponse.json({ tracked: true, type: 'updated' }),
        sessionId,
        issueCookie,
      );
    }

    const completedRead = (scrollDepth ?? 0) >= COMPLETION_SCROLL_DEPTH;

    // One transaction: the view row and the aggregate counters stay in step.
    await prisma.$transaction([
      prisma.blogPostView.create({
        data: {
          postId,
          userId: user?.id || null,
          sessionId: user?.id ? null : sessionId,
          ipHash,
          readDuration,
          scrollDepth,
          referrer,
          deviceType,
          completedRead,
        },
      }),
      prisma.blogPost.update({
        where: { id: postId },
        data: {
          viewCount: { increment: 1 },
          views: { increment: 1 },
          uniqueViewCount: { increment: 1 },
        },
      }),
      ...(post.authorProfileId
        ? [
          prisma.authorProfile.update({
            where: { id: post.authorProfileId },
            data: { totalViews: { increment: 1 } },
          }),
        ]
        : []),
    ]);

    return withSessionCookie(
      NextResponse.json({ tracked: true, type: 'new' }),
      sessionId,
      issueCookie,
    );
  } catch (error) {
    console.error('Error tracking view:', error);
    // Never fail the page because analytics hiccuped (§13, §27).
    return withSessionCookie(
      NextResponse.json({ tracked: false, error: 'Tracking failed' }),
      sessionId,
      issueCookie,
    );
  }
}

/**
 * Attach the anonymous session cookie when we minted a new one. httpOnly keeps
 * it out of client JavaScript; it carries no personal data, only a random id.
 */
function withSessionCookie(response: NextResponse, sessionId: string | null, issue: boolean) {
  if (issue && sessionId) {
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionId,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
  }

  return response;
}
