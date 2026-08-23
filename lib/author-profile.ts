/**
 * Author presentation helpers — the single source of truth for how an author's
 * public identity is derived, validated and linked across the blog.
 *
 * Why this file exists:
 *  - `/author/[username]`, the article byline and the end-of-article author card
 *    all need the same rules for building social URLs, the canonical profile URL
 *    and the (opt-in) contact email. Previously each surface re-implemented them.
 *  - Every URL that originates from author input is normalised and re-validated
 *    here before it is ever rendered, so a hostile value can never become a
 *    `javascript:` / `data:` link (see `sanitizeExternalUrl`).
 *
 * This module is intentionally dependency-free so it can be imported from both
 * server components and client components.
 */

/** Canonical public author route. Kept in one place so URLs never diverge. */
export const AUTHOR_PROFILE_BASE_PATH = '/author';

/** `/author/ephey-nyaga` — or null when the author has no username to link to. */
export function getAuthorProfileHref(username?: string | null): string | null {
    const clean = (username ?? '').trim().toLowerCase();
    if (!clean) return null;
    return `${AUTHOR_PROFILE_BASE_PATH}/${encodeURIComponent(clean)}`;
}

/**
 * Accept only safe, absolute http(s) URLs.
 *
 * - A bare host (`example.com/farm`) is upgraded to `https://`.
 * - Anything using another scheme (`javascript:`, `data:`, `file:`, `mailto:`)
 *   or that fails URL parsing returns null so the caller can simply omit it.
 */
export function sanitizeExternalUrl(value?: string | null): string | null {
    const raw = (value ?? '').trim();
    if (!raw) return null;

    // Reject control characters early — they can be used to smuggle schemes.
    if (/[\s<>"'`\\]/.test(raw) && !/^https?:\/\//i.test(raw)) return null;

    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;

    let url: URL;
    try {
        url = new URL(candidate);
    } catch {
        return null;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname || !url.hostname.includes('.')) return null;

    return url.toString();
}

/** `example.com/farm` — a compact, human-readable form of a validated URL. */
export function prettyExternalUrl(value: string): string {
    try {
        const url = new URL(value);
        const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
        return `${url.hostname.replace(/^www\./, '')}${path}`;
    } catch {
        return value;
    }
}

/* -------------------------------------------------------------------------- */
/*  Social links                                                              */
/* -------------------------------------------------------------------------- */

export type AuthorSocialPlatform =
    | 'facebook'
    | 'instagram'
    | 'x'
    | 'linkedin'
    | 'youtube'
    | 'github'
    | 'website';

export interface AuthorSocialLink {
    platform: AuthorSocialPlatform;
    /** Human label used for the accessible name, e.g. "Facebook". */
    label: string;
    /** Fully validated absolute URL. */
    href: string;
}

/**
 * The stored shape on `AuthorProfile`. Fields are a mix of handles and full
 * URLs because that is what the existing editor accepts — both are supported.
 */
export interface AuthorSocialSource {
    facebookUrl?: string | null;
    instagramHandle?: string | null;
    twitterHandle?: string | null;
    linkedinUrl?: string | null;
    youtubeChannel?: string | null;
    githubUsername?: string | null;
    website?: string | null;
}

/** Handles we are willing to interpolate into a URL path. */
export const AUTHOR_HANDLE_PATTERN = /^[A-Za-z0-9._-]{1,60}$/;
const HANDLE_PATTERN = AUTHOR_HANDLE_PATTERN;


/** True when the value already looks like a link rather than a handle. */
function looksLikeUrl(value: string): boolean {
    return /^[a-z][a-z0-9+.-]*:/i.test(value) || /^[\w-]+(\.[\w-]+)+\//.test(value) || /^[\w-]+(\.[\w-]+){1,}$/.test(value);
}

/**
 * Turn a stored value into a safe URL.
 * `template` receives an already-validated handle.
 */
function resolveSocialUrl(
    value: string | null | undefined,
    template: (handle: string) => string,
): string | null {
    const raw = (value ?? '').trim();
    if (!raw) return null;

    if (looksLikeUrl(raw)) {
        return sanitizeExternalUrl(raw);
    }

    const handle = raw.replace(/^@+/, '').replace(/^\/+|\/+$/g, '');
    if (!HANDLE_PATTERN.test(handle)) return null;

    return sanitizeExternalUrl(template(handle));
}

/**
 * Build the ordered, de-duplicated list of an author's social links.
 * Only links that survive validation are returned, so callers can rely on
 * `links.length === 0` to hide the whole section (no empty containers).
 */
export function buildAuthorSocialLinks(source: AuthorSocialSource): AuthorSocialLink[] {
    const candidates: Array<{ platform: AuthorSocialPlatform; label: string; href: string | null }> = [
        {
            platform: 'facebook',
            label: 'Facebook',
            href: resolveSocialUrl(source.facebookUrl, (h) => `https://facebook.com/${h}`),
        },
        {
            platform: 'instagram',
            label: 'Instagram',
            href: resolveSocialUrl(source.instagramHandle, (h) => `https://instagram.com/${h}`),
        },
        {
            platform: 'x',
            label: 'X (Twitter)',
            href: resolveSocialUrl(source.twitterHandle, (h) => `https://x.com/${h}`),
        },
        {
            platform: 'linkedin',
            label: 'LinkedIn',
            href: resolveSocialUrl(source.linkedinUrl, (h) => `https://linkedin.com/in/${h}`),
        },
        {
            platform: 'youtube',
            label: 'YouTube',
            href: resolveSocialUrl(source.youtubeChannel, (h) => `https://youtube.com/@${h}`),
        },
        {
            platform: 'github',
            label: 'GitHub',
            href: resolveSocialUrl(source.githubUsername, (h) => `https://github.com/${h}`),
        },
        {
            platform: 'website',
            label: 'Website',
            href: sanitizeExternalUrl(source.website),
        },
    ];

    const seen = new Set<string>();
    const links: AuthorSocialLink[] = [];

    for (const candidate of candidates) {
        if (!candidate.href) continue;
        const key = candidate.href.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        links.push({ platform: candidate.platform, label: candidate.label, href: candidate.href });
    }

    return links;
}

/* -------------------------------------------------------------------------- */
/*  Write-path validation (used by the profile API before persisting)         */
/* -------------------------------------------------------------------------- */

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Validate one author-supplied social value before it is stored (§33).
 *
 * Accepts either a bare handle (`epheynyaga`, `@epheynyaga`) or a full http(s)
 * URL, and rejects everything else — including `javascript:` / `data:` URLs and
 * malformed input. An empty value clears the field.
 */
export function normalizeAuthorSocialInput(
    value: unknown,
    label: string,
): ValidationResult<string | null> {
    if (value === null || value === undefined) return { ok: true, value: null };
    if (typeof value !== 'string') return { ok: false, error: `${label} must be text` };

    const raw = value.trim();
    if (!raw) return { ok: true, value: null };
    if (raw.length > 300) return { ok: false, error: `${label} is too long` };

    if (looksLikeUrl(raw)) {
        const url = sanitizeExternalUrl(raw);
        if (!url) return { ok: false, error: `${label} must be a valid http(s) link` };
        return { ok: true, value: url };
    }

    const handle = raw.replace(/^@+/, '').replace(/^\/+|\/+$/g, '');
    if (!AUTHOR_HANDLE_PATTERN.test(handle)) {
        return { ok: false, error: `${label} must be a valid username or http(s) link` };
    }

    return { ok: true, value: handle };
}

/** Website field: stored as a normalised absolute http(s) URL, or cleared. */
export function normalizeAuthorWebsiteInput(value: unknown): ValidationResult<string | null> {
    if (value === null || value === undefined) return { ok: true, value: null };
    if (typeof value !== 'string') return { ok: false, error: 'Website must be text' };

    const raw = value.trim();
    if (!raw) return { ok: true, value: null };
    if (raw.length > 300) return { ok: false, error: 'Website URL is too long' };

    const url = sanitizeExternalUrl(raw);
    if (!url) return { ok: false, error: 'Website must be a valid http(s) URL' };

    return { ok: true, value: url };
}

/** Max number of expertise tags an author may publish. */
export const AUTHOR_EXPERTISE_LIMIT = 8;

/**
 * Clean the expertise list: trimmed, de-duplicated (case-insensitively),
 * length-capped and free of markup characters (§11, §33).
 */
export function normalizeAuthorExpertise(value: unknown): ValidationResult<string[]> {
    if (value === null || value === undefined) return { ok: true, value: [] };
    if (!Array.isArray(value)) return { ok: false, error: 'Areas of expertise must be a list' };

    const seen = new Set<string>();
    const tags: string[] = [];

    for (const entry of value) {
        if (typeof entry !== 'string') continue;
        const tag = entry.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
        if (!tag) continue;
        if (tag.length > 40) return { ok: false, error: 'Each area of expertise must be 40 characters or fewer' };

        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        tags.push(tag);

        if (tags.length > AUTHOR_EXPERTISE_LIMIT) {
            return { ok: false, error: `You can list up to ${AUTHOR_EXPERTISE_LIMIT} areas of expertise` };
        }
    }

    return { ok: true, value: tags };
}

/**
 * Collapse whitespace and strip angle brackets from a free-text profile field.
 * Text is always rendered as text (never as HTML), so this is defence in depth.
 */
export function normalizeAuthorText(
    value: unknown,
    label: string,
    maxLength: number,
): ValidationResult<string | null> {
    if (value === null || value === undefined) return { ok: true, value: null };
    if (typeof value !== 'string') return { ok: false, error: `${label} must be text` };

    const text = value.replace(/[<>]/g, '').replace(/[ \t]+/g, ' ').trim();
    if (!text) return { ok: true, value: null };
    if (text.length > maxLength) {
        return { ok: false, error: `${label} must be ${maxLength} characters or fewer` };
    }

    return { ok: true, value: text };
}

/* -------------------------------------------------------------------------- */
/*  Public contact email                                                      */
/* -------------------------------------------------------------------------- */


const EMAIL_PATTERN = /^[^\s@<>"']+@[^\s@<>"'.]+\.[^\s@<>"']+$/;

/**
 * Resolve the address to expose in a `mailto:` link.
 *
 * The author must have explicitly opted in (`showEmail`) — there is no implicit
 * exposure of the account/login address anywhere in the UI.
 */
export function resolveAuthorContactEmail(input: {
    showEmail?: boolean | null;
    email?: string | null;
}): string | null {
    if (!input.showEmail) return null;

    const email = (input.email ?? '').trim();
    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;

    return email;
}

/* -------------------------------------------------------------------------- */
/*  Small presentation helpers                                                */
/* -------------------------------------------------------------------------- */

/**
 * "Poultry Health Specialist at Sunrise Farm" — the professional title shown
 * under the author's name. Returns null when neither field is set.
 */
export function buildProfessionalTitle(
    occupation?: string | null,
    company?: string | null,
): string | null {
    const role = (occupation ?? '').trim();
    const org = (company ?? '').trim();

    if (role && org) return `${role} at ${org}`;
    return role || org || null;
}

/** `1,248` / `4.8K` — compact but never misleading. */
export function formatAuthorStat(value: number | null | undefined): string {
    const n = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return n.toLocaleString('en-US');
}

/** `Joined March 2025`, or null for an unparsable date. */
export function formatJoinedLabel(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
