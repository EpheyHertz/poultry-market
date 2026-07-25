import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  submitToIndexNow,
  submitPathToIndexNow,
  INDEXNOW_KEY_LOCATION,
  IndexNowAction,
} from '@/lib/indexnow';

// POST /api/indexnow
// Admin-only endpoint to notify search engines about new/updated/deleted URLs.
//
// Body (JSON):
//   {
//     "urls":  ["https://www.poultrymarket.app/product/x", ...],  // absolute URLs
//     "paths": ["/product/x", "/blog/y"],                          // OR site-relative paths
//     "action": "created" | "updated" | "deleted"                  // optional
//   }
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { urls, paths, action } = body as {
      urls?: string[];
      paths?: string[];
      action?: IndexNowAction;
    };

    if (action && !['created', 'updated', 'deleted'].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'created', 'updated', or 'deleted'" },
        { status: 400 },
      );
    }

    const hasUrls = Array.isArray(urls) && urls.length > 0;
    const hasPaths = Array.isArray(paths) && paths.length > 0;

    if (!hasUrls && !hasPaths) {
      return NextResponse.json(
        { error: "Provide a non-empty 'urls' or 'paths' array" },
        { status: 400 },
      );
    }

    const result = hasUrls
      ? await submitToIndexNow(urls as string[], action)
      : await submitPathToIndexNow(paths as string[], action);

    return NextResponse.json(
      {
        success: result.ok,
        status: result.status,
        message: result.message,
        submitted: result.submitted,
        keyLocation: INDEXNOW_KEY_LOCATION,
      },
      { status: result.ok ? 200 : result.status >= 400 ? result.status : 502 },
    );
  } catch (error) {
    console.error('IndexNow submission error:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit URLs to IndexNow',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// GET /api/indexnow — quick health/info check (admin only).
export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'configured',
    keyLocation: INDEXNOW_KEY_LOCATION,
    endpoint: 'https://api.indexnow.org/indexnow',
    docs: 'https://www.indexnow.org/documentation',
  });
}
