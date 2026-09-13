/**
 * Email address helpers shared by the client form, the public API routes and
 * the admin dashboard.
 *
 * Normalisation matters a lot here: Postgres unique indexes are case
 * sensitive, so "Farmer@Gmail.com" and "farmer@gmail.com" used to be able to
 * create two rows for the same human. Every write path funnels through
 * `normalizeEmail`.
 */

// Deliberately pragmatic: rejects the obvious garbage without fighting RFC 5322.
const EMAIL_PATTERN = /^[^\s@,;:<>"'()[\]\\]+@[^\s@.,;:<>"'()[\]\\]+(\.[^\s@.,;:<>"'()[\]\\]+)+$/;

export function normalizeEmail(email: string | null | undefined): string {
    return (email ?? '').trim().toLowerCase();
}

export function isValidEmail(email: string | null | undefined): boolean {
    const value = normalizeEmail(email);
    if (!value || value.length > 254) return false;

    const [local] = value.split('@');
    if (!local || local.length > 64) return false;
    if (value.includes('..')) return false;

    return EMAIL_PATTERN.test(value);
}

/** Masks an address for logs / "we sent it to f•••@gmail.com" copy. */
export function maskEmail(email: string): string {
    const value = normalizeEmail(email);
    const atIndex = value.indexOf('@');
    if (atIndex <= 0) return '•••';

    const local = value.slice(0, atIndex);
    const domain = value.slice(atIndex + 1);
    const visible = local.slice(0, Math.min(2, local.length));

    return `${visible}${'•'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

/** Trims a human name to something safe to drop into an email greeting. */
export function normalizeName(name: string | null | undefined): string | null {
    if (!name) return null;
    const cleaned = name.replace(/[\r\n\t<>]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;
    return cleaned.slice(0, 80);
}

/** "Wanjiku Mwangi" -> "Wanjiku"; falls back to a friendly default. */
export function firstNameOf(name: string | null | undefined, fallback = 'there'): string {
    const cleaned = normalizeName(name);
    if (!cleaned) return fallback;
    return cleaned.split(' ')[0] || fallback;
}
