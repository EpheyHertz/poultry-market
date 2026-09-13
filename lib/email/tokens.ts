/**
 * Token helpers for subscription verification / preference links.
 *
 * Rules enforced here:
 *  - tokens are 32 bytes of CSPRNG entropy (url-safe, no padding)
 *  - only the SHA-256 hash is ever stored, so a database leak cannot be used
 *    to verify or unsubscribe anyone
 *  - verification tokens are single-use and expiring; the longer-lived
 *    "manage" token can be rotated at any time
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

export type TokenPair = {
    /** Raw value - only ever placed in the outgoing email link. */
    token: string;
    /** SHA-256 hex digest - the only thing persisted. */
    hash: string;
};

export function generateToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token.trim()).digest('hex');
}

export function createTokenPair(bytes = 32): TokenPair {
    const token = generateToken(bytes);
    return { token, hash: hashToken(token) };
}

function getTokenSecret(): string {
    const secret =
        process.env.EMAIL_TOKEN_SECRET ||
        process.env.JWT_SECRET ||
        process.env.NEXTAUTH_SECRET;

    if (!secret) {
        // Same posture as lib/auth.ts: never crash the request, but the value
        // is obviously not production grade.
        console.warn(
            '[email] EMAIL_TOKEN_SECRET/JWT_SECRET is not set - manage links are using an insecure fallback secret.'
        );
        return 'poultry-market-email-fallback-secret';
    }

    return secret;
}

/**
 * Preference/unsubscribe tokens are derived deterministically from the
 * subscriber id, so *every* email we send can rebuild the same working link
 * while the database still only stores the hash. Rotating
 * `EMAIL_TOKEN_SECRET` invalidates all outstanding links at once.
 */
export function deriveManageToken(subscriberId: string): string {
    return createHmac('sha256', getTokenSecret())
        .update(`manage:${subscriberId}`)
        .digest('base64url');
}

export function deriveManageTokenPair(subscriberId: string): TokenPair {
    const token = deriveManageToken(subscriberId);
    return { token, hash: hashToken(token) };
}

/** Constant-time comparison for equal-length hex digests. */
export function safeCompareHashes(a: string, b: string): boolean {
    if (!a || !b || a.length !== b.length) return false;
    try {
        return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
        return false;
    }
}

export function tokenExpiry(hours: number, from: Date = new Date()): Date {
    return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function isExpired(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
    if (!expiresAt) return true;
    return expiresAt.getTime() <= now.getTime();
}

/**
 * Basic shape check before we hit the database, so obviously bogus tokens are
 * rejected without a query (and without leaking timing information).
 */
export function looksLikeToken(value: unknown): value is string {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(value.trim());
}

export function secondsUntil(date: Date | null | undefined, now: Date = new Date()): number {
    if (!date) return 0;
    return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 1000));
}

export function secondsSince(date: Date | null | undefined, now: Date = new Date()): number {
    if (!date) return Number.POSITIVE_INFINITY;
    return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
}
