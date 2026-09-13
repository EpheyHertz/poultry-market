import { NextRequest, NextResponse } from 'next/server';
import { drainPendingCampaigns } from '@/lib/email/campaigns';

// Drain runs can be long-lived (they send email in batches), so keep this off
// the edge runtime and give it the largest window the platform allows.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Shared authorization for the email-drain cron. Mirrors the pattern used by the
 * other cron routes: if CRON_SECRET is unset (local/dev) the endpoint is open,
 * otherwise the caller must present it via the `x-cron-secret` header or a
 * `secret` query param. This also accepts a standard Bearer token so it works
 * out of the box with Vercel Cron (which sends `Authorization: Bearer …`).
 */
function isAuthorized(request: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return true;

    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : null;

    const provided =
        request.headers.get('x-cron-secret') ||
        bearer ||
        request.nextUrl.searchParams.get('secret');

    return provided === secret;
}

async function runDrain(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    // Keep the work comfortably inside the function timeout. Individual campaigns
    // are claimed atomically and retried, so any leftover recipients are simply
    // picked up by the next scheduled run — nothing is ever lost or double-sent.
    const timeBudgetMs = Math.max(
        5_000,
        Math.min(50_000, Number(request.nextUrl.searchParams.get('timeBudgetMs')) || 45_000),
    );
    const maxCampaigns = Math.max(
        1,
        Math.min(50, Number(request.nextUrl.searchParams.get('maxCampaigns')) || 10),
    );

    const result = await drainPendingCampaigns({ timeBudgetMs, maxCampaigns });

    const sent = result.campaigns.reduce((total, c) => total + (c.sent ?? 0), 0);
    const failed = result.campaigns.reduce((total, c) => total + (c.failed ?? 0), 0);
    const remaining = result.campaigns.reduce((total, c) => total + (c.remaining ?? 0), 0);

    return NextResponse.json({
        success: true,
        drained: result.drained,
        processedCampaigns: result.campaigns.length,
        sent,
        failed,
        remaining,
        campaigns: result.campaigns,
    });
}

export async function POST(request: NextRequest) {
    try {
        return await runDrain(request);
    } catch (error) {
        console.error('Email drain cron error:', error);
        return NextResponse.json({ error: 'Failed to drain email campaigns' }, { status: 500 });
    }
}

// Some schedulers (e.g. Vercel Cron) invoke endpoints with GET, so expose the
// same behaviour there rather than forcing callers to use POST.
export async function GET(request: NextRequest) {
    try {
        return await runDrain(request);
    } catch (error) {
        console.error('Email drain cron error:', error);
        return NextResponse.json({ error: 'Failed to drain email campaigns' }, { status: 500 });
    }
}
