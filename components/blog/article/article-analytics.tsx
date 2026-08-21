'use client';

/**
 * ArticleAnalytics — §12 (view tracking) + §13 (reading analytics)
 *
 * Design rules from the spec:
 *  - A view is NOT counted on page load. It is counted after *meaningful engagement*
 *    (≥ VIEW_DWELL_MS of visible dwell time OR ≥ VIEW_SCROLL_THRESHOLD% of the article read).
 *  - Rapid refreshes must not double count → sessionStorage guard per post.
 *  - Scroll tracking is throttled; only discrete milestones emit events.
 *  - Scroll depth is measured against the *article content container*, not the document.
 *  - Everything is best-effort: analytics must never break the reading experience.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    type ReactNode,
} from 'react';

import { trackEvent } from '@/components/analytics/google-analytics';

const VIEW_DWELL_MS = 10_000;
const VIEW_SCROLL_THRESHOLD = 25;
const VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;
const SCROLL_MILESTONES = [25, 50, 75, 90] as const;
const COMPLETION_THRESHOLD = 97;
const SCROLL_THROTTLE_MS = 350;
const TICK_MS = 1_000;

export interface ArticleAnalyticsContextValue {
    trackShare: (network: string) => void;
    trackExternalLink: (url: string) => void;
    trackRecommendedClick: (payload: { slug?: string; title?: string; placement?: string }) => void;
    trackVideoPlay: (videoId: string) => void;
    trackEmbedOpen: (payload: { provider: string; url: string }) => void;
    trackTocClick: (headingId: string) => void;
}

/**
 * Fallback implementation so the hook is safe to use outside a provider
 * (e.g. a recommended card rendered on a listing page).
 */
const fallbackValue: ArticleAnalyticsContextValue = {
    trackShare: (network) => trackEvent('share_click', { network }),
    trackExternalLink: (url) => trackEvent('external_link_click', { link_url: url }),
    trackRecommendedClick: (payload) => trackEvent('recommended_article_click', payload),
    trackVideoPlay: (videoId) => trackEvent('video_play', { video_id: videoId }),
    trackEmbedOpen: (payload) => trackEvent('embed_open', payload),
    trackTocClick: (headingId) => trackEvent('toc_click', { heading_id: headingId }),
};

const ArticleAnalyticsContext = createContext<ArticleAnalyticsContextValue>(fallbackValue);

export function useArticleAnalytics(): ArticleAnalyticsContextValue {
    return useContext(ArticleAnalyticsContext);
}

export interface ArticleAnalyticsProviderProps {
    postId: string;
    slug: string;
    title: string;
    category?: string | null;
    authorUsername?: string | null;
    /** Element used to measure reading progress / scroll depth. */
    targetId?: string;
    /** Disable the network view call (used by previews / drafts). */
    disableViewTracking?: boolean;
    children?: ReactNode;
}

function readSessionFlag(key: string): number | null {
    try {
        const raw = window.sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function writeSessionFlag(key: string, value: number): void {
    try {
        window.sessionStorage.setItem(key, String(value));
    } catch {
        /* storage disabled — degrade to server-side dedupe */
    }
}

export function ArticleAnalyticsProvider({
    postId,
    slug,
    title,
    category,
    authorUsername,
    targetId = 'article-content',
    disableViewTracking = false,
    children,
}: ArticleAnalyticsProviderProps) {
    const stateRef = useRef({
        maxScroll: 0,
        activeSeconds: 0,
        viewSent: false,
        completed: false,
        started: false,
        milestones: new Set<number>(),
        lastFlushSignature: '',
    });

    const baseParams = useMemo(
        () => ({
            article_slug: slug,
            article_title: title,
            article_category: category ?? undefined,
            article_author: authorUsername ?? undefined,
        }),
        [slug, title, category, authorUsername],
    );

    const emit = useCallback(
        (event: string, params?: Record<string, unknown>) => {
            trackEvent(event, { ...baseParams, ...params });
        },
        [baseParams],
    );

    /** Persist engagement to the backend. Safe to call multiple times — the API keeps maximums. */
    const flush = useCallback(
        (options?: { useBeacon?: boolean; force?: boolean }) => {
            if (disableViewTracking || !postId) return;

            const state = stateRef.current;
            const payload = {
                readDuration: Math.round(state.activeSeconds),
                scrollDepth: Math.round(state.maxScroll),
                referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
            };

            const signature = `${payload.readDuration}:${payload.scrollDepth}`;
            if (!options?.force && signature === state.lastFlushSignature) return;
            state.lastFlushSignature = signature;

            const endpoint = `/api/blog/posts/by-id/${encodeURIComponent(postId)}/view`;
            const body = JSON.stringify(payload);

            if (options?.useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
                try {
                    const blob = new Blob([body], { type: 'application/json' });
                    if (navigator.sendBeacon(endpoint, blob)) return;
                } catch {
                    /* fall through to fetch */
                }
            }

            void fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                keepalive: true,
                credentials: 'same-origin',
            }).catch(() => {
                /* analytics must never surface an error to the reader */
            });
        },
        [disableViewTracking, postId],
    );

    /** Register the view once engagement is proven. */
    const registerView = useCallback(
        (trigger: 'dwell' | 'scroll') => {
            const state = stateRef.current;
            if (state.viewSent) return;

            const guardKey = `pmk:article-view:${postId}`;
            const previous = readSessionFlag(guardKey);
            const now = Date.now();
            const isDuplicate = previous !== null && now - previous < VIEW_DEDUPE_WINDOW_MS;

            state.viewSent = true;
            writeSessionFlag(guardKey, now);

            emit('article_view', { engagement_trigger: trigger, duplicate_suppressed: isDuplicate });

            // The server also dedupes per session/user, but skipping the request entirely on a
            // rapid refresh keeps the endpoint quiet and prevents any chance of double counting.
            if (!isDuplicate) flush({ force: true });
        },
        [emit, flush, postId],
    );

    // --- scroll depth + milestones ------------------------------------------------
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let frame = 0;
        let lastRun = 0;
        let cancelled = false;

        const measure = () => {
            frame = 0;
            const element = document.getElementById(targetId);
            if (!element) return;

            const rect = element.getBoundingClientRect();
            const viewport = window.innerHeight || document.documentElement.clientHeight || 0;
            if (viewport <= 0) return;

            let percent: number;
            const scrollable = rect.height - viewport;

            if (scrollable <= 0) {
                // Article shorter than the viewport: complete once its end is on screen.
                percent = rect.bottom <= viewport + 8 ? 100 : Math.max(0, Math.min(100, ((viewport - rect.top) / rect.height) * 100));
            } else {
                percent = (-rect.top / scrollable) * 100;
            }

            percent = Math.max(0, Math.min(100, percent));

            const state = stateRef.current;
            if (percent > state.maxScroll) state.maxScroll = percent;

            if (!state.started && percent > 1) {
                state.started = true;
                emit('article_read_start');
            }

            for (const milestone of SCROLL_MILESTONES) {
                if (state.maxScroll >= milestone && !state.milestones.has(milestone)) {
                    state.milestones.add(milestone);
                    emit('article_scroll_depth', { depth: milestone, percent_scrolled: milestone });
                }
            }

            if (!state.completed && state.maxScroll >= COMPLETION_THRESHOLD) {
                state.completed = true;
                emit('article_complete', { read_seconds: Math.round(state.activeSeconds) });
                flush({ force: true });
            }

            if (state.maxScroll >= VIEW_SCROLL_THRESHOLD) registerView('scroll');
        };

        const onScroll = () => {
            if (cancelled || frame) return;
            const now = Date.now();
            if (now - lastRun < SCROLL_THROTTLE_MS) return;
            lastRun = now;
            frame = window.requestAnimationFrame(measure);
        };

        measure();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });

        return () => {
            cancelled = true;
            if (frame) window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [emit, flush, registerView, targetId]);

    // --- dwell timer (only counts while the tab is visible) -----------------------
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'hidden') return;
            const state = stateRef.current;
            state.activeSeconds += TICK_MS / 1000;
            if (state.activeSeconds * 1000 >= VIEW_DWELL_MS) registerView('dwell');
        }, TICK_MS);

        return () => window.clearInterval(interval);
    }, [registerView]);

    // --- final flush on leave ----------------------------------------------------
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const finalFlush = () => {
            if (!stateRef.current.viewSent) return;
            flush({ useBeacon: true });
        };

        const onVisibility = () => {
            if (document.visibilityState === 'hidden') finalFlush();
        };

        window.addEventListener('pagehide', finalFlush);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.removeEventListener('pagehide', finalFlush);
            document.removeEventListener('visibilitychange', onVisibility);
            finalFlush();
        };
    }, [flush]);

    const value = useMemo<ArticleAnalyticsContextValue>(
        () => ({
            trackShare: (network) => emit('share_click', { network, method: network }),
            trackExternalLink: (url) => emit('external_link_click', { link_url: url }),
            trackRecommendedClick: ({ slug: targetSlug, title: targetTitle, placement }) =>
                emit('recommended_article_click', {
                    target_slug: targetSlug,
                    target_title: targetTitle,
                    placement: placement ?? 'unknown',
                }),
            trackVideoPlay: (videoId) => emit('video_play', { video_id: videoId, provider: 'youtube' }),
            trackEmbedOpen: ({ provider, url }) => emit('embed_open', { provider, link_url: url }),
            trackTocClick: (headingId) => emit('toc_click', { heading_id: headingId }),
        }),
        [emit],
    );

    return <ArticleAnalyticsContext.Provider value={value}>{children}</ArticleAnalyticsContext.Provider>;
}

export default ArticleAnalyticsProvider;
