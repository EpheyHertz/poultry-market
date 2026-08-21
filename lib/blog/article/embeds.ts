/**
 * Embed detection for article Markdown (§8, §9, §10).
 *
 * Pure string helpers — shared by the Markdown renderer (client) and the
 * link-preview API (server). Nothing here performs network I/O.
 */

export type EmbedKind = 'youtube' | 'facebook' | 'website';

export interface YouTubeRef {
    /** 11-character video id. */
    id: string;
    /** Start offset in seconds, from `?t=` / `#t=`. */
    startSeconds?: number;
}

const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
    'youtu.be',
    'www.youtu.be',
]);

const FACEBOOK_HOSTS = new Set([
    'facebook.com',
    'www.facebook.com',
    'm.facebook.com',
    'web.facebook.com',
    'fb.watch',
    'www.fb.watch',
    'fb.com',
    'www.fb.com',
]);

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function safeUrl(raw: string): URL | null {
    try {
        const url = new URL(raw.trim());
        return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
    } catch {
        return null;
    }
}

/** `1h2m3s` / `90` / `90s` → seconds. */
function parseTimestamp(value: string | null): number | undefined {
    if (!value) return undefined;
    if (/^\d+$/.test(value)) return Number(value);

    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
    if (!match || (!match[1] && !match[2] && !match[3])) return undefined;

    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2] ?? 0);
    const seconds = Number(match[3] ?? 0);
    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : undefined;
}

/**
 * Extract a YouTube video reference from any of the common URL shapes:
 * `watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `/live/`, `/v/`.
 * Returns null when the URL is not a recognisable single-video YouTube link.
 */
export function parseYouTubeUrl(raw: string): YouTubeRef | null {
    const url = safeUrl(raw);
    if (!url || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;

    const startSeconds = parseTimestamp(url.searchParams.get('t') ?? url.hash.replace(/^#t=/, '') ?? null);
    const segments = url.pathname.split('/').filter(Boolean);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    // youtu.be/<id>
    if (host === 'youtu.be') {
        const id = segments[0];
        return id && VIDEO_ID.test(id) ? { id, startSeconds } : null;
    }

    // youtube.com/watch?v=<id>
    const queryId = url.searchParams.get('v');
    if (queryId && VIDEO_ID.test(queryId)) return { id: queryId, startSeconds };

    // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
    if (segments.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(segments[0])) {
        const id = segments[1];
        if (VIDEO_ID.test(id)) return { id, startSeconds };
    }

    return null;
}

/** True for any Facebook post / video / page / reel / profile URL. */
export function isFacebookUrl(raw: string): boolean {
    const url = safeUrl(raw);
    return Boolean(url && FACEBOOK_HOSTS.has(url.hostname.toLowerCase()));
}

/** Privacy-enhanced embed URL (§9 — no cookies until the user plays). */
export function youtubeEmbedUrl(ref: YouTubeRef, autoplay = true): string {
    const params = new URLSearchParams({
        rel: '0',
        modestbranding: '1',
        playsinline: '1',
    });
    if (autoplay) params.set('autoplay', '1');
    if (ref.startSeconds) params.set('start', String(ref.startSeconds));
    return `https://www.youtube-nocookie.com/embed/${ref.id}?${params.toString()}`;
}

/** Canonical watch URL, used for the "Watch on YouTube" error fallback (§27). */
export function youtubeWatchUrl(ref: YouTubeRef): string {
    const suffix = ref.startSeconds ? `&t=${ref.startSeconds}` : '';
    return `https://www.youtube.com/watch?v=${ref.id}${suffix}`;
}

/**
 * Thumbnail candidates, best quality first. `maxresdefault` is missing for many
 * videos, so the component walks this list on image error (§27).
 */
export function youtubeThumbnails(videoId: string): string[] {
    return [
        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    ];
}

/** Facebook's plugin URL for click-to-load embedding (§10). */
export function facebookEmbedUrl(rawUrl: string, kind: 'post' | 'video' = 'post'): string {
    const params = new URLSearchParams({
        href: rawUrl,
        show_text: 'true',
        width: '640',
    });
    return `https://www.facebook.com/plugins/${kind}.php?${params.toString()}`;
}

/** `true` when a Facebook URL points at a video/reel/watch resource. */
export function isFacebookVideoUrl(raw: string): boolean {
    const url = safeUrl(raw);
    if (!url) return false;
    const path = url.pathname.toLowerCase();
    return (
        url.hostname.toLowerCase().includes('fb.watch') ||
        path.includes('/videos/') ||
        path.includes('/reel/') ||
        path.startsWith('/watch')
    );
}

/**
 * Classify a bare URL found in article text so the renderer can pick a card.
 * Anything that isn't YouTube or Facebook becomes a generic website preview.
 */
export function classifyUrl(raw: string): EmbedKind | null {
    if (!safeUrl(raw)) return null;
    if (parseYouTubeUrl(raw)) return 'youtube';
    if (isFacebookUrl(raw)) return 'facebook';
    return 'website';
}

/** Absolute http(s) URL check used before rendering any embed card. */
export function isAbsoluteHttpUrl(raw: string): boolean {
    return safeUrl(raw) !== null;
}

/**
 * True when a paragraph consists of nothing but a single URL — the signal we
 * use to upgrade it from a plain link into a rich card (§8).
 */
export function extractStandaloneUrl(text: string): string | null {
    const trimmed = (text ?? '').trim();
    if (!trimmed || /\s/.test(trimmed)) return null;
    return isAbsoluteHttpUrl(trimmed) ? trimmed : null;
}
