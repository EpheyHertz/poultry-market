'use client';

/**
 * FacebookEmbed (§10, §26, §27)
 *
 * Facebook's plugin iframe is heavy, frequently blocked (ad-blockers, privacy
 * browsers, regional restrictions) and cannot be feature-detected reliably.
 * So we follow the same facade approach as YouTube:
 *
 *   1. Render a lightweight branded card by default — no Facebook JS at all.
 *   2. Only mount `facebook.com/plugins/{post,video}.php` after a click.
 *   3. If the iframe never signals `load` within a grace period (blocked or
 *      restricted), fall back to the "View this post on Facebook →" card so a
 *      large broken embed area is never left on the page.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Facebook, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { facebookEmbedUrl, isFacebookVideoUrl } from '@/lib/blog/article/embeds';

interface FacebookEmbedProps {
    url: string;
    className?: string;
    /** Fired when the reader chooses to load the embed (analytics §13). */
    onLoadRequest?: (url: string) => void;
}

/** How long we wait for the plugin iframe before assuming it was blocked. */
const LOAD_TIMEOUT_MS = 6000;

export function FacebookEmbed({ url, className, onLoadRequest }: FacebookEmbedProps) {
    const isVideo = isFacebookVideoUrl(url);
    const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const handleLoadEmbed = useCallback(() => {
        setState('loading');
        onLoadRequest?.(url);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            // `onLoad` never fired — treat as blocked and degrade gracefully.
            setState((current) => (current === 'loading' ? 'failed' : current));
        }, LOAD_TIMEOUT_MS);
    }, [onLoadRequest, url]);

    const handleIframeLoad = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setState('ready');
    }, []);

    const handleIframeError = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setState('failed');
    }, []);

    // Graceful fallback card (§10) — also the initial, JS-free state.
    if (state === 'idle' || state === 'failed') {
        return (
            <div
                className={cn(
                    'not-prose my-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900',
                    className,
                )}
            >
                <div className="flex items-start gap-3 border-b border-gray-100 bg-[#1877F2]/5 p-4 dark:border-gray-800 dark:bg-[#1877F2]/10">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-white">
                        <Facebook className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Facebook</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {state === 'failed'
                                ? 'This content could not be loaded here.'
                                : isVideo
                                    ? 'Facebook video'
                                    : 'Facebook post'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {state === 'failed'
                            ? 'Facebook restricted this embed. You can still open it directly.'
                            : 'Load the embedded content from Facebook, or open it in a new tab.'}
                    </p>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {state === 'idle' && (
                            <button
                                type="button"
                                onClick={handleLoadEmbed}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] focus-visible:ring-offset-2"
                            >
                                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                                Load embed
                            </button>
                        )}
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#1877F2] hover:text-[#1877F2] dark:border-gray-700 dark:text-gray-200 dark:hover:border-[#1877F2] dark:hover:text-[#4a9bff]"
                        >
                            View on Facebook
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <figure className={cn('not-prose my-8', className)}>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className={cn('relative w-full', isVideo ? 'aspect-video' : 'h-[560px]')}>
                    {state === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-gray-50 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1877F2] border-t-transparent" />
                            Loading Facebook content…
                        </div>
                    )}
                    <iframe
                        src={facebookEmbedUrl(url, isVideo ? 'video' : 'post')}
                        title="Facebook content"
                        loading="lazy"
                        scrolling="no"
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        onLoad={handleIframeLoad}
                        onError={handleIframeError}
                        className="absolute inset-0 h-full w-full border-0"
                    />
                </div>
            </div>

            <figcaption className="mt-2 text-right text-xs">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-[#1877F2] dark:text-gray-400"
                >
                    View on Facebook
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
            </figcaption>
        </figure>
    );
}

export default FacebookEmbed;
