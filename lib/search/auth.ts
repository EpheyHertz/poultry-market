/**
 * External API Authentication
 *
 * Validates Bearer token API keys for external consumers (e.g. the
 * FastAPI AI Blog Generator). The expected key is stored in the
 * POULTRY_MARKET_API_KEY environment variable.
 *
 * Returns null when the request is authenticated, or a NextResponse
 * with the appropriate HTTP status code when it is not.
 */

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against itself to keep timing consistent, then return false
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate the Authorization header against the configured API key.
 *
 * @returns null if valid, otherwise a NextResponse to return immediately.
 */
export function validateExternalApiKey(
  request: Request,
): NextResponse | null {
  const configuredKey = process.env.POULTRY_MARKET_API_KEY;

  if (!configuredKey) {
    // Misconfiguration — do not expose details
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer' },
      },
    );
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return NextResponse.json(
      { error: 'Invalid authorization scheme. Expected: Bearer <token>' },
      {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer' },
      },
    );
  }

  if (!safeCompare(token.trim(), configuredKey)) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer' },
      },
    );
  }

  return null; // authenticated
}
