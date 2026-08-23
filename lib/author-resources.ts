/**
 * Author recommended / affiliate resources — shared domain logic.
 *
 * Deliberately dependency-free so both server routes and client components can
 * import it (same pattern as `lib/author-profile.ts`).
 *
 * `§n` refers to sections of `extension_of_blog.md`.
 *
 * Two rules worth calling out because they pull in opposite directions:
 *
 *  - §4 requires strict URL validation (http(s) only, no localhost/private
 *    hosts, no `javascript:`/`data:`).
 *  - §21 requires affiliate tracking parameters to be preserved *verbatim* —
 *    stripping `?tag=author-20` silently breaks the author's commission.
 *
 * So `validateResourceUrl()` validates the host and scheme but never rewrites
 * the query string. Only the *fetch* path (which reuses the article
 * link-preview normaliser) is allowed to tidy a URL, and its result is used
 * solely for metadata lookup — never for what we store or link to.
 */

/* ------------------------------------------------------------------ *
 * Result type (mirrors lib/author-profile.ts)
 * ------------------------------------------------------------------ */

export type ResourceResult<T> = { ok: true; value: T } | { ok: false; error: string };

/* ------------------------------------------------------------------ *
 * Limits
 * ------------------------------------------------------------------ */

export const RESOURCE_LIMITS = {
    title: 140,
    description: 300,
    url: 2048,
    disclosure: 200,
    /** Per-author ceiling so a profile can't become a link farm. */
    maxPerAuthor: 24,
} as const;

/** Shown when an author marks a resource as affiliate but writes no custom text (§10). */
export const DEFAULT_AFFILIATE_DISCLOSURE =
    'Some links may earn the author a commission at no additional cost to you.';

/* ------------------------------------------------------------------ *
 * Merchant identification (§2, §3, §9)
 * ------------------------------------------------------------------ */

/**
 * Friendly names for merchants we can identify with confidence.
 *
 * This is a *display* convenience, not an allowlist — any safe http(s) host is
 * accepted (§3: "Do not require a new code change every time an author adds a
 * different merchant"). Unknown hosts fall back to showing the domain, and we
 * never invent a merchant name (§9).
 */
const MERCHANT_PATTERNS: ReadonlyArray<{ test: RegExp; name: string }> = [
    // Amazon marketplaces + short links (§2). Covers amazon.com, .co.uk, .de,
    // .co.ke, .com.br, amzn.to, amzn.eu, a.co ...
    { test: /(^|\.)amazon\.[a-z.]{2,}$/, name: 'Amazon' },
    { test: /(^|\.)amzn\.(to|eu|com)$/, name: 'Amazon' },
    { test: /^a\.co$/, name: 'Amazon' },
    { test: /(^|\.)jumia\.[a-z.]{2,}$/, name: 'Jumia' },
    { test: /(^|\.)kilimall\.[a-z.]{2,}$/, name: 'Kilimall' },
    { test: /(^|\.)ebay\.[a-z.]{2,}$/, name: 'eBay' },
    { test: /(^|\.)aliexpress\.[a-z.]{2,}$/, name: 'AliExpress' },
    { test: /(^|\.)alibaba\.[a-z.]{2,}$/, name: 'Alibaba' },
    { test: /(^|\.)etsy\.com$/, name: 'Etsy' },
    { test: /(^|\.)takealot\.com$/, name: 'Takealot' },
    { test: /(^|\.)konga\.com$/, name: 'Konga' },
    { test: /(^|\.)shopify\.com$/, name: 'Shopify' },
    { test: /(^|\.)gumroad\.com$/, name: 'Gumroad' },
    { test: /(^|\.)udemy\.com$/, name: 'Udemy' },
    { test: /(^|\.)coursera\.org$/, name: 'Coursera' },
    { test: /(^|\.)youtube\.com$/, name: 'YouTube' },
    { test: /(^|\.)youtu\.be$/, name: 'YouTube' },
];

/** Strip `www.` (and the odd `m.`) for display + storage. */
export function toResourceDomain(hostname: string): string {
    return hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
}

/**
 * Best-effort merchant name for a hostname.
 * Returns `null` when we cannot identify it confidently — callers then show
 * the bare domain instead of guessing (§9).
 */
export function identifyMerchant(hostname: string): string | null {
    const domain = toResourceDomain(hostname);
    for (const { test, name } of MERCHANT_PATTERNS) {
        if (test.test(domain)) return name;
    }
    return null;
}

/** What to print in the card's merchant slot: merchant name, else domain (§9). */
export function resourceMerchantLabel(
    merchant: string | null | undefined,
    domain: string,
): string {
    return merchant?.trim() || domain;
}

/* ------------------------------------------------------------------ *
 * URL validation (§4, §21)
 * ------------------------------------------------------------------ */

/** Ports that are plausibly a public website. */
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    'ip6-localhost',
    'ip6-loopback',
    'metadata',
    'metadata.google.internal',
    'instance-data',
]);

const BLOCKED_HOST_SUFFIXES = [
    '.localhost',
    '.local',
    '.internal',
    '.intranet',
    '.lan',
    '.home',
    '.corp',
    '.test',
    '.example',
    '.invalid',
];

function isPrivateIPv4(host: string): boolean {
    const parts = host.split('.');
    if (parts.length !== 4) return false;

    const octets = parts.map((part) => Number(part));
    if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;

    const [a, b] = octets;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 192 && b === 0) return true; // 192.0.0.0/24, 192.0.2.0/24
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast + reserved
    return false;
}

function isPrivateIPv6(host: string): boolean {
    const raw = host.replace(/^\[|\]$/g, '').toLowerCase();
    if (!raw.includes(':')) return false;
    if (raw === '::' || raw === '::1') return true;
    if (raw.startsWith('fe80')) return true; // link-local
    if (raw.startsWith('fc') || raw.startsWith('fd')) return true; // unique local
    if (raw.startsWith('::ffff:')) return isPrivateIPv4(raw.slice('::ffff:'.length));
    return false;
}

/** Description of a validated destination. */
export interface ResourceDestination {
    /** The author's URL, unchanged apart from a trim + protocol default. */
    url: string;
    /** Normalised hostname, e.g. `amazon.com`. */
    domain: string;
    /** Friendly merchant name, or `null` when unknown. */
    merchant: string | null;
}

/**
 * Validate an author-supplied destination URL.
 *
 * Accepts a bare host (`amazon.com/dp/...` → `https://amazon.com/dp/...`) for
 * convenience, then enforces §4:
 *   - http/https only — `javascript:`, `data:`, `file:`, `ftp:` are rejected
 *   - no embedded credentials
 *   - no localhost / loopback / private / link-local / CGNAT destinations
 *   - no internal-only TLDs
 *   - no non-web ports
 *
 * The query string is preserved exactly so affiliate attribution survives (§21).
 */
export function validateResourceUrl(value: unknown): ResourceResult<ResourceDestination> {
    if (typeof value !== 'string' || !value.trim()) {
        return { ok: false, error: 'A resource URL is required' };
    }

    const trimmed = value.trim();
    if (trimmed.length > RESOURCE_LIMITS.url) {
        return { ok: false, error: 'That URL is too long' };
    }

    // Reject dangerous schemes explicitly so the error message is useful,
    // rather than letting them fail the "looks like a host" check below.
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
        return { ok: false, error: 'Only http:// and https:// links are allowed' };
    }

    let parsed: URL;
    try {
        parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    } catch {
        return { ok: false, error: 'That does not look like a valid URL' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, error: 'Only http:// and https:// links are allowed' };
    }
    if (parsed.username || parsed.password) {
        return { ok: false, error: 'URLs with embedded credentials are not allowed' };
    }
    if (!ALLOWED_PORTS.has(parsed.port)) {
        return { ok: false, error: 'That URL uses a port we cannot link to' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || hostname.length > 253) {
        return { ok: false, error: 'That does not look like a valid URL' };
    }
    if (
        BLOCKED_HOSTNAMES.has(hostname) ||
        BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix)) ||
        isPrivateIPv4(hostname) ||
        isPrivateIPv6(hostname)
    ) {
        return { ok: false, error: 'That URL points to a private or internal address' };
    }
    if (!hostname.includes('.') && !hostname.startsWith('[')) {
        return { ok: false, error: 'That does not look like a public website' };
    }

    const domain = toResourceDomain(hostname);

    return {
        ok: true,
        value: {
            // `parsed.toString()` keeps the path, query and affiliate tags intact.
            url: parsed.toString(),
            domain,
            merchant: identifyMerchant(hostname),
        },
    };
}

/**
 * Validate an image URL supplied by the author or lifted from `og:image` (§19).
 * Returns `null` (not an error) for blank input so the card can fall back to a
 * domain placeholder instead of showing a broken image.
 */
export function validateResourceImageUrl(value: unknown): ResourceResult<string | null> {
    if (value === undefined || value === null || value === '') return { ok: true, value: null };
    if (typeof value !== 'string') return { ok: false, error: 'Image URL must be text' };

    const trimmed = value.trim();
    if (!trimmed) return { ok: true, value: null };

    const result = validateResourceUrl(trimmed);
    if (!result.ok) return { ok: false, error: 'Image URL must be a valid http(s) URL' };
    return { ok: true, value: result.value.url };
}

/* ------------------------------------------------------------------ *
 * Text fields
 * ------------------------------------------------------------------ */

/**
 * Collapse whitespace, strip angle brackets and enforce a max length.
 * Blank input becomes `null` so optional columns stay clean.
 */
export function normalizeResourceText(
    value: unknown,
    label: string,
    maxLength: number,
): ResourceResult<string | null> {
    if (value === undefined || value === null) return { ok: true, value: null };
    if (typeof value !== 'string') return { ok: false, error: `${label} must be text` };

    const cleaned = value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return { ok: true, value: null };
    if (cleaned.length > maxLength) {
        return { ok: false, error: `${label} must be ${maxLength} characters or fewer` };
    }
    return { ok: true, value: cleaned };
}

/** Same as {@link normalizeResourceText} but the value is mandatory. */
export function normalizeRequiredResourceText(
    value: unknown,
    label: string,
    maxLength: number,
): ResourceResult<string> {
    const result = normalizeResourceText(value, label, maxLength);
    if (!result.ok) return result;
    if (!result.value) return { ok: false, error: `${label} is required` };
    return { ok: true, value: result.value };
}

/* ------------------------------------------------------------------ *
 * Rendering helpers
 * ------------------------------------------------------------------ */

/**
 * `rel` for an outbound resource link (§11).
 *
 * `sponsored` is added **only** for links the author marked as affiliate, so
 * ordinary editorial references are not mislabelled.
 */
export function resourceLinkRel(isAffiliate: boolean): string {
    return isAffiliate
        ? 'sponsored noopener noreferrer'
        : 'noopener noreferrer nofollow';
}

/** The disclosure text to render, or `null` when none applies (§10). */
export function resourceDisclosure(
    isAffiliate: boolean,
    custom?: string | null,
): string | null {
    if (!isAffiliate) return null;
    return custom?.trim() || DEFAULT_AFFILIATE_DISCLOSURE;
}

/** Shape shared by the dashboard, the author profile and article surfaces. */
export interface AuthorResourceView {
    id: string;
    title: string;
    description: string | null;
    url: string;
    domain: string;
    merchant: string | null;
    imageUrl: string | null;
    isAffiliate: boolean;
    affiliateDisclosure: string | null;
    isActive: boolean;
    displayOrder: number;
}

/** Row → view model. Keeps one mapping in one place (§26 one source of truth). */
export function toAuthorResourceView(row: {
    id: string;
    title: string;
    description: string | null;
    url: string;
    domain: string;
    merchant: string | null;
    imageUrl: string | null;
    isAffiliate: boolean;
    affiliateDisclosure: string | null;
    isActive: boolean;
    displayOrder: number;
}): AuthorResourceView {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        url: row.url,
        domain: row.domain,
        merchant: row.merchant,
        imageUrl: row.imageUrl,
        isAffiliate: row.isAffiliate,
        affiliateDisclosure: row.affiliateDisclosure,
        isActive: row.isActive,
        displayOrder: row.displayOrder,
    };
}
