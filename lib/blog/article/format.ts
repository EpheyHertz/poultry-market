/**
 * Presentation helpers for the editorial article page.
 *
 * Everything here is pure and safe to import from both server and client
 * components (no Node or DOM APIs).
 */

/**
 * Human-friendly compact number: 999 → "999", 1240 → "1.2K", 12400 → "12.4K",
 * 1_200_000 → "1.2M". Used for view counts in article metadata (§12).
 */
export function formatCompactNumber(value: number | null | undefined): string {
    const n = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

    if (n < 1_000) return String(n);

    const units: Array<{ limit: number; divisor: number; suffix: string }> = [
        { limit: 1_000_000_000, divisor: 1_000_000_000, suffix: 'B' },
        { limit: 1_000_000, divisor: 1_000_000, suffix: 'M' },
        { limit: 1_000, divisor: 1_000, suffix: 'K' },
    ];

    for (const { limit, divisor, suffix } of units) {
        if (n >= limit) {
            const scaled = n / divisor;
            // One decimal below 10 (1.2K), none above (12K) — newsroom convention.
            const text = scaled >= 10 ? Math.round(scaled).toString() : (Math.round(scaled * 10) / 10).toString();
            return `${text.replace(/\.0$/, '')}${suffix}`;
        }
    }

    return String(n);
}

/** `2,481 views` / `1 view` */
export function formatViewLabel(value: number | null | undefined): string {
    const n = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    return `${formatCompactNumber(n)} ${n === 1 ? 'view' : 'views'}`;
}

/** `8 min read`, with a sensible floor so we never render "0 min read". */
export function formatReadingTime(minutes: number | null | undefined): string {
    const m = typeof minutes === 'number' && Number.isFinite(minutes) ? Math.max(1, Math.round(minutes)) : 1;
    return `${m} min read`;
}

/** Stable, locale-independent article date: `Aug 21, 2026`. */
export function formatArticleDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

/** ISO string for `<time dateTime>` / structured data. Returns null when unset. */
export function toIsoDate(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * True when `updatedAt` is meaningfully newer than `publishedAt` — used to
 * decide whether to surface a "Updated …" line (§2). A 24h grace window keeps
 * routine re-saves from flagging every article as updated.
 */
export function hasMeaningfulUpdate(
    publishedAt: string | Date | null | undefined,
    updatedAt: string | Date | null | undefined,
    graceMs = 24 * 60 * 60 * 1000,
): boolean {
    const published = publishedAt ? new Date(publishedAt).getTime() : NaN;
    const updated = updatedAt ? new Date(updatedAt).getTime() : NaN;
    if (Number.isNaN(published) || Number.isNaN(updated)) return false;
    return updated - published > graceMs;
}

/** `example.com` from a URL, without `www.`; falls back to the raw input. */
export function prettyHostname(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./i, '');
    } catch {
        return url.replace(/^https?:\/\//i, '').split('/')[0] || url;
    }
}

/** Truncate on a word boundary and append an ellipsis. */
export function truncate(text: string, maxLength: number): string {
    const clean = (text ?? '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLength) return clean;
    const cut = clean.slice(0, maxLength - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
