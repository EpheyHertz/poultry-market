/**
 * Website link previews for article content (§8, §26, §27).
 *
 * Fetches Open Graph / Twitter card metadata for external URLs referenced
 * inside article Markdown so the renderer can show a rich card instead of a
 * long raw URL.
 *
 * Hard requirements baked in here:
 *  - SSRF hardening: only http(s), no credentials, no private/loopback/
 *    link-local/CGNAT hosts, no non-standard ports, capped redirects.
 *  - Never blocks/breaks page rendering: every failure path returns a usable
 *    fallback payload (domain + URL) instead of throwing.
 *  - Cheap: 3s timeout, ~512KB read cap, in-memory LRU + Next fetch cache.
 */

import { prettyHostname, truncate } from './format';

/** Metadata returned to the client for a single URL. */
export interface LinkPreviewData {
    /** The URL that was requested (normalised). */
    url: string;
    /** Bare hostname without `www.` — always present. */
    domain: string;
    /** og:site_name, or the domain when unavailable. */
    siteName: string;
    /** og:title / twitter:title / <title>. */
    title: string | null;
    /** og:description / twitter:description / meta description. */
    description: string | null;
    /** Absolute image URL when available. */
    image: string | null;
    /** Absolute favicon URL (best effort, may 404 client-side). */
    favicon: string | null;
    /** True when metadata was actually parsed from the page. */
    resolved: boolean;
}

const FETCH_TIMEOUT_MS = 3000;
const MAX_BYTES = 512 * 1024; // 512KB is far more than <head> ever needs
const MAX_REDIRECTS = 3;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_MAX_ENTRIES = 300;
const USER_AGENT =
    'Mozilla/5.0 (compatible; PoultryMarketKenyaBot/1.0; +https://poultrymarketke.vercel.app)';

/** Ports we allow. Anything else smells like an internal service probe. */
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

/** Hostnames that must never be fetched. */
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

/* ------------------------------------------------------------------ *
 * Cache
 * ------------------------------------------------------------------ */

interface CacheEntry {
    data: LinkPreviewData;
    expiresAt: number;
}

const previewCache = new Map<string, CacheEntry>();

function cacheGet(key: string): LinkPreviewData | null {
    const entry = previewCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
        previewCache.delete(key);
        return null;
    }

    // Refresh LRU recency.
    previewCache.delete(key);
    previewCache.set(key, entry);
    return entry.data;
}

function cacheSet(key: string, data: LinkPreviewData): void {
    if (previewCache.size >= CACHE_MAX_ENTRIES) {
        const oldest = previewCache.keys().next();
        if (!oldest.done) previewCache.delete(oldest.value);
    }
    previewCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Exposed for tests / manual invalidation. */
export function clearLinkPreviewCache(): void {
    previewCache.clear();
}

/* ------------------------------------------------------------------ *
 * URL safety
 * ------------------------------------------------------------------ */

function isPrivateIPv4(host: string): boolean {
    const parts = host.split('.');
    if (parts.length !== 4) return false;

    const octets = parts.map((part) => Number(part));
    if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;

    const [a, b] = octets;

    if (a === 0) return true; // 0.0.0.0/8 "this network"
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local (cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 192 && b === 0) return true; // 192.0.0.0/24 + 192.0.2.0/24
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast + reserved

    return false;
}

function isPrivateIPv6(host: string): boolean {
    // URL hostname keeps IPv6 in brackets.
    const raw = host.replace(/^\[|\]$/g, '').toLowerCase();
    if (!raw.includes(':')) return false;

    if (raw === '::' || raw === '::1') return true; // unspecified / loopback
    if (raw.startsWith('fe80')) return true; // link-local
    if (raw.startsWith('fc') || raw.startsWith('fd')) return true; // unique local
    if (raw.startsWith('::ffff:')) {
        // IPv4-mapped — validate the embedded v4 address.
        return isPrivateIPv4(raw.slice('::ffff:'.length));
    }
    return false;
}

/**
 * Validate and normalise a URL for outbound fetching.
 * Returns `null` when the URL must not be fetched.
 */
export function normalizePreviewUrl(rawUrl: string): URL | null {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl.trim());
    } catch {
        return null;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (!ALLOWED_PORTS.has(parsed.port)) return null;

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || hostname.length > 253) return null;
    if (BLOCKED_HOSTNAMES.has(hostname)) return null;
    if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return null;
    if (!hostname.includes('.') && !hostname.startsWith('[')) return null; // bare hosts = internal
    if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) return null;

    // Strip tracking noise + fragments so the cache key stays tight.
    parsed.hash = '';
    for (const param of Array.from(parsed.searchParams.keys())) {
        if (/^(utm_|fbclid$|gclid$|mc_eid$|mc_cid$|ref_src$)/i.test(param)) {
            parsed.searchParams.delete(param);
        }
    }

    return parsed;
}

/* ------------------------------------------------------------------ *
 * HTML metadata parsing
 * ------------------------------------------------------------------ */

/** Decode the handful of entities that actually show up in meta tags. */
function decodeEntities(value: string): string {
    return value
        .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
            const named: Record<string, string> = {
                amp: '&',
                lt: '<',
                gt: '>',
                quot: '"',
                apos: "'",
                nbsp: ' ',
                hellip: '…',
                mdash: '—',
                ndash: '–',
                rsquo: '’',
                lsquo: '‘',
                ldquo: '“',
                rdquo: '”',
            };

            if (entity.startsWith('#x') || entity.startsWith('#X')) {
                const code = Number.parseInt(entity.slice(2), 16);
                return Number.isFinite(code) ? String.fromCodePoint(code) : match;
            }
            if (entity.startsWith('#')) {
                const code = Number.parseInt(entity.slice(1), 10);
                return Number.isFinite(code) ? String.fromCodePoint(code) : match;
            }
            return named[entity.toLowerCase()] ?? match;
        })
        .replace(/\s+/g, ' ')
        .trim();
}

/** Collect every `<meta>` tag as a lowercase key → value map. */
function parseMetaTags(html: string): Map<string, string> {
    const tags = new Map<string, string>();
    const metaRegex = /<meta\b[^>]*>/gi;

    let match: RegExpExecArray | null;
    while ((match = metaRegex.exec(html)) !== null) {
        const tag = match[0];
        const key =
            /\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
        const value = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
        if (!key || !value) continue;

        const normalizedKey = key.trim().toLowerCase();
        if (!tags.has(normalizedKey)) {
            tags.set(normalizedKey, decodeEntities(value));
        }
    }

    return tags;
}

function parseTitleTag(html: string): string | null {
    const match = /<title[^>]*>([\s\S]{0,400}?)<\/title>/i.exec(html);
    if (!match) return null;
    const text = decodeEntities(match[1].replace(/<[^>]*>/g, ''));
    return text || null;
}

function parseIconHref(html: string, base: URL): string | null {
    const linkRegex = /<link\b[^>]*>/gi;
    let best: { href: string; score: number } | null = null;

    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html)) !== null) {
        const tag = match[0];
        const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
        const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
        if (!rel || !href || !/icon/.test(rel)) continue;

        // Prefer apple-touch-icon (bigger) then plain icon then shortcut icon.
        const score = rel.includes('apple') ? 3 : rel.includes('shortcut') ? 1 : 2;
        if (!best || score > best.score) best = { href, score };
    }

    if (!best) return null;
    return absolutize(best.href, base);
}

/** Resolve a possibly relative URL against the page URL; drop unsafe values. */
function absolutize(value: string | null | undefined, base: URL): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) {
        return null;
    }

    try {
        const resolved = new URL(trimmed, base);
        if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
        return resolved.toString();
    } catch {
        return null;
    }
}

function firstOf(tags: Map<string, string>, keys: string[]): string | null {
    for (const key of keys) {
        const value = tags.get(key);
        if (value) return value;
    }
    return null;
}

/* ------------------------------------------------------------------ *
 * Fetching
 * ------------------------------------------------------------------ */

/** A safe, always-renderable fallback card (§27). */
export function buildFallbackPreview(rawUrl: string): LinkPreviewData {
    let url = rawUrl;
    let domain = rawUrl;

    try {
        const parsed = new URL(rawUrl);
        url = parsed.toString();
        domain = prettyHostname(parsed.toString());
    } catch {
        domain = prettyHostname(rawUrl) || rawUrl;
    }

    return {
        url,
        domain,
        siteName: domain,
        title: null,
        description: null,
        image: null,
        favicon: null,
        resolved: false,
    };
}

/** Read at most `MAX_BYTES` of the response body as text. */
async function readCapped(response: Response): Promise<string> {
    const body = response.body;
    if (!body) return await response.text();

    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const chunks: string[] = [];
    let received = 0;

    try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;

            received += value.byteLength;
            chunks.push(decoder.decode(value, { stream: true }));

            const html = chunks.join('');
            // The <head> is all we need — bail as soon as we've seen </head>.
            if (received >= MAX_BYTES || /<\/head>/i.test(html)) break;
        }
    } finally {
        // Releasing the lock lets the connection be discarded promptly.
        try {
            await reader.cancel();
        } catch {
            /* ignore */
        }
    }

    return chunks.join('');
}

/**
 * Fetch Open Graph metadata for a single URL.
 *
 * Always resolves — on any failure you get {@link buildFallbackPreview}
 * output with `resolved: false`, so callers never need a try/catch.
 */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreviewData> {
    const target = normalizePreviewUrl(rawUrl);
    if (!target) return buildFallbackPreview(rawUrl);

    const cacheKey = target.toString();
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const fallback = buildFallbackPreview(cacheKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        // `redirect: 'manual'` lets us re-validate every hop against the SSRF
        // rules instead of trusting the remote server's Location header.
        let current = target;
        let response: Response | null = null;

        for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
            const hopResponse = await fetch(current.toString(), {
                method: 'GET',
                redirect: 'manual',
                signal: controller.signal,
                headers: {
                    'User-Agent': USER_AGENT,
                    Accept: 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en',
                },
                // Cache at the Next.js data-cache layer too (§8 "cache where appropriate").
                next: { revalidate: 86400, tags: ['blog-link-preview'] },
            } as RequestInit);

            const location = hopResponse.headers.get('location');
            const isRedirect = hopResponse.status >= 300 && hopResponse.status < 400;

            if (!isRedirect || !location || hop === MAX_REDIRECTS) {
                response = hopResponse;
                break;
            }

            const nextUrl = normalizePreviewUrl(new URL(location, current).toString());
            if (!nextUrl) return fallback;
            current = nextUrl;
        }

        if (!response || !response.ok) return fallback;

        const contentType = response.headers.get('content-type') ?? '';
        if (!/text\/html|application\/xhtml/i.test(contentType)) return fallback;

        const html = await readCapped(response);
        if (!html) return fallback;

        const tags = parseMetaTags(html);
        const pageUrl = current;

        const title =
            firstOf(tags, ['og:title', 'twitter:title', 'title']) ?? parseTitleTag(html);
        const description = firstOf(tags, [
            'og:description',
            'twitter:description',
            'description',
        ]);
        const image = absolutize(
            firstOf(tags, [
                'og:image:secure_url',
                'og:image:url',
                'og:image',
                'twitter:image',
                'twitter:image:src',
            ]),
            pageUrl,
        );
        const siteName = firstOf(tags, ['og:site_name', 'application-name']);
        const favicon =
            parseIconHref(html, pageUrl) ?? absolutize('/favicon.ico', pageUrl);
        const domain = prettyHostname(pageUrl.toString());

        const data: LinkPreviewData = {
            url: pageUrl.toString(),
            domain,
            siteName: siteName ? truncate(siteName, 60) : domain,
            title: title ? truncate(title, 120) : null,
            description: description ? truncate(description, 200) : null,
            image,
            favicon,
            resolved: Boolean(title || description || image),
        };

        cacheSet(cacheKey, data);
        return data;
    } catch {
        // Timeouts, DNS failures, TLS errors, aborted reads — all fall back.
        return fallback;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Resolve several previews at once, de-duplicated, with a hard ceiling so a
 * link-heavy article can't fan out into dozens of outbound requests (§26).
 */
export async function fetchLinkPreviews(
    urls: string[],
    maxRequests = 8,
): Promise<Record<string, LinkPreviewData>> {
    const unique: string[] = [];
    const seen = new Set<string>();

    for (const url of urls) {
        const normalized = normalizePreviewUrl(url);
        const key = normalized ? normalized.toString() : url;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(url);
        if (unique.length >= maxRequests) break;
    }

    const results = await Promise.all(unique.map((url) => fetchLinkPreview(url)));

    const map: Record<string, LinkPreviewData> = {};
    unique.forEach((url, index) => {
        map[url] = results[index];
    });
    return map;
}
