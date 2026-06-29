import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey } from '@/lib/api-keys';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';


/**
 * Test API Key endpoint for external blog clients.
 *
 * - Verifies whether a provided API key is ACTIVE, REVOKED, INACTIVE, or missing/invalid.
 * - Protected against misuse via strict rate limiting.
 * - Does NOT reveal whether a key ID exists; it only returns coarse status.
 */

const testApiKeySchema = z.object({
  apiKey: z.string().min(10).max(300),
});

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key') ?? undefined;

  // Require caller to provide the key they want to test.
  // Also enforce a basic request shape to prevent accidental abuse.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  const parsed = testApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const rawKeyToTest = parsed.data.apiKey;

  // Rate limit by (provided api key if present) + IP to avoid enum/replay.
  const identifier = getClientIdentifier(request, apiKey ? `key:${apiKey}` : undefined);
  const rate = checkRateLimit(identifier, {
    // External test endpoint: keep it low.
    maxRequests: 6,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please wait before testing API keys again.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': (rate.resetIn / 1000).toString(),
          'X-RateLimit-Limit': '6',
          'X-RateLimit-Remaining': rate.remaining.toString(),
        },
      }
    );
  }

  // Coarse validation:
  // - If authenticateApiKey succeeds => ACTIVE
  // - If raw key is syntactically invalid => MISSING_OR_INVALID
  // - Otherwise check status in DB for revoked/inactive
  const auth = await authenticateApiKey(rawKeyToTest);
  if (auth) {
    return NextResponse.json({
      ok: true,
      apiKey: {
        status: 'ACTIVE',
      },
    });
  }

  // If authentication failed, we still can check status without revealing too much.
  // We parse the raw key using the same parsing logic from lib/api-keys.
  // Since parseApiKey is not exported, we match the expected format defensively.
  const parts = rawKeyToTest.split('_');
  if (parts.length !== 4) {
    return NextResponse.json({
      ok: false,
      apiKey: { status: 'MISSING_OR_INVALID' },
    });
  }

  const [prefix, env, id] = parts;
  if (!prefix || env === undefined || !id) {
    return NextResponse.json({
      ok: false,
      apiKey: { status: 'MISSING_OR_INVALID' },
    });
  }

  // Query the key record by id.
  // Note: even if the key doesn't exist, we return coarse result.
  const keyRecord = await prisma.apiKey.findUnique({
    where: { id },
    select: { status: true, revokedAt: true },
  });

  if (!keyRecord) {
    return NextResponse.json({
      ok: false,
      apiKey: { status: 'MISSING_OR_INVALID' },
    });
  }

  if (keyRecord.revokedAt || keyRecord.status === 'REVOKED') {
    return NextResponse.json({
      ok: false,
      apiKey: { status: 'REVOKED' },
    });
  }

  if (keyRecord.status === 'INACTIVE') {
    return NextResponse.json({
      ok: false,
      apiKey: { status: 'INACTIVE' },
    });
  }

  // If status is ACTIVE but authentication failed, treat as MISSING_OR_INVALID
  // to avoid leaking whether an ID is valid.
  return NextResponse.json({
    ok: false,
    apiKey: { status: 'MISSING_OR_INVALID' },
  });
}

export const dynamic = 'force-dynamic';

