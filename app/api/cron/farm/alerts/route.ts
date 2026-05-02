import { NextRequest, NextResponse } from 'next/server';
import { runFarmAlertsJob } from '@/modules/eggs/email-jobs';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const provided =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  return provided === secret;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    const result = await runFarmAlertsJob();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Farm alerts cron error:', error);
    return NextResponse.json({ error: 'Failed to run alerts job' }, { status: 500 });
  }
}
