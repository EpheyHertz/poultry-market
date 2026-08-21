'use client';

/**
 * YouTubeEmbed (§9, §26, §27)
 *
 * Facade pattern: we render a static thumbnail + play button and only mount the
 * privacy-enhanced `youtube-nocookie.com` iframe after the reader clicks. That
 * means zero third-party JavaScript/cookies for readers who never play the
 * video, and no layout shift because the 16:9 box is reserved up front.
 *
 * Failure handling: thumbnails fall back through maxres → sd → hq → a branded
 * gradient placeholder; if the iframe itself is blocked the reader still has a
 * clear "Watch on YouTube" link.
 */

import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    parseYouTubeUrl,
    youtubeEmbedUrl,
    youtubeThumbnails,
    youtubeWatchUrl,
    type YouTubeRef,
} from '@/lib/blog/article/embeds';

interface YouTubeEmbedProps {
    /** Any YouTube URL form (watch, youtu.be, shorts, embed, live). */
    url: string;
    /** Optional caption rendered under the player. */
    title?: string;
    className?: string;
    /** Fired once when the reader starts the video (analytics §13). */
    onPlay?: (videoId: string) => void;
}

export function YouTubeEmbed({ url, title, className, onPlay }: YouTubeEmbedProps) {
    const ref: YouTubeRef | null = useMemo(() => parseYouTubeUrl(url), [url]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [thumbIndex, setThumbIndex] = useState(0);

    const thumbnails = useMemo(
        () => (ref ? youtubeThumbnails(ref.id) : []),
        [ref],
    );

    const handlePlay = useCallback(() => {
        if (!ref) return;
        setIsPlaying(true);
        onPlay?.(ref.id);
    }, [ref, onPlay]);

    // Not a recognisable YouTube URL — render a plain safe link instead of a
    // broken player (§27).
    if (!ref) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="not-prose inline-flex items-center gap-1.5 break-all text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
                {url}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
        );
    }

    const watchUrl = youtubeWatchUrl(ref);
    const thumbnail = thumbnails[thumbIndex];

    return (
        <figure className={cn('not-prose my-8', className)}>
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-900 shadow-sm dark:border-gray-800">
                {/* Reserved 16:9 box — prevents layout shift on every breakpoint. */}
                <div className="relative aspect-video w-full">
                    {isPlaying ? (
                        <iframe
                            src={youtubeEmbedUrl(ref, true)}
                            title={title || 'YouTube video player'}
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                            className="absolute inset-0 h-full w-full border-0"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={handlePlay}
                            aria-label={title ? `Play video: ${title}` : 'Play video'}
                            className="group absolute inset-0 h-full w-full cursor-pointer"
                        >
                            {thumbnail ? (
                                // Arbitrary i.ytimg.com host isn't in next.config
                                // remotePatterns, so a plain <img> is correct here.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={thumbnail}
                                    alt={title ? `Thumbnail for ${title}` : 'Video thumbnail'}
                                    loading="lazy"
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                    onError={() => setThumbIndex((index) => index + 1)}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                />
                            ) : (
                                <div className="h-full w-full bg-gradient-to-br from-gray-800 via-gray-900 to-black" />
                            )}

                            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-red-500 sm:h-[72px] sm:w-[72px]">
                                <Play className="ml-0.5 h-7 w-7 fill-white text-white sm:h-8 sm:w-8" aria-hidden="true" />
                            </span>

                            <span className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 p-3 sm:p-4">
                                <span className="line-clamp-2 text-left text-sm font-medium text-white sm:text-base">
                                    {title || 'Watch on YouTube'}
                                </span>
                                <span className="hidden shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm sm:inline-block">
                                    YouTube
                                </span>
                            </span>
                        </button>
                    )}
                </div>
            </div>

            <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="min-w-0 truncate">{title || 'YouTube video'}</span>
                <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 font-medium text-gray-600 hover:text-emerald-700 dark:text-gray-300 dark:hover:text-emerald-300"
                >
                    Watch on YouTube
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
            </figcaption>
        </figure>
    );
}

export default YouTubeEmbed;
