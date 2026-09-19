import { NextRequest, NextResponse } from 'next/server';
import { buildAndSendWeeklyDigest } from '@/lib/email/weekly-digest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

async function handleWeeklyCron(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    const audienceParam = request.nextUrl.searchParams.get('audience');
    const audience =
        audienceParam === 'subscribers'
            ? 'subscribers'
            : 'verified_users';

    const result = await buildAndSendWeeklyDigest({ audience });

    if (!result.ok) {
        return NextResponse.json({
            success: false,
            reason: result.reason,
        }, { status: 400 });
    }

    return NextResponse.json({
        success: true,
        campaignId: result.campaign?.id,
        audience,
        totalRecipients: result.totalRecipients,
        articleCount: result.articleCount,
        articles: result.articles,
        message: `Weekly digest broadcast queued for ${result.totalRecipients} recipient(s).`,
    });
}

export async function GET(request: NextRequest) {
    try {
        return await handleWeeklyCron(request);
    } catch (error) {
        console.error('Weekly digest cron GET error:', error);
        return NextResponse.json({ error: 'Failed to run weekly digest cron' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        return await handleWeeklyCron(request);
    } catch (error) {
        console.error('Weekly digest cron POST error:', error);
        return NextResponse.json({ error: 'Failed to run weekly digest cron' }, { status: 500 });
    }
}
