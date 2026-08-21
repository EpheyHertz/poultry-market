'use client';

/**
 * ArticleImage (§19, §27)
 *
 * Renders Markdown images as editorial figures:
 *   - Never wider than the article column (max-w-full + rounded corners)
 *   - Reserved aspect ratio while loading, so no layout shift
 *   - Lazy loaded below the fold, `alt` always passed through
 *   - The Markdown `title` (`![alt](src "caption")`) becomes a caption
 *   - Click to open a larger view (dialog with Esc / backdrop close)
 *   - Broken URLs degrade to a clean branded placeholder instead of the
 *     browser's broken-image icon
 *
 * next/image is intentionally avoided: article bodies can reference any host
 * and next.config.js only whitelists a few remotePatterns, so optimisation
 * would hard-fail on legitimate content. Images are already served from
 * Cloudinary with sensible sizes.
 */

import { useCallback, useEffect, useState } from 'react';
import { ImageOff, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArticleImageProps {
    src?: string;
    alt?: string;
    /** Markdown title attribute — used as the caption when present. */
    title?: string;
    className?: string;
    /** Disable the click-to-zoom behaviour (e.g. inside a link). */
    disableZoom?: boolean;
}

export function ArticleImage({ src, alt, title, className, disableZoom }: ArticleImageProps) {
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [zoomed, setZoomed] = useState(false);

    const caption = title?.trim() || '';
    const altText = alt?.trim() || caption || 'Article illustration';

    // Esc closes the lightbox; body scroll is locked while it is open.
    useEffect(() => {
        if (!zoomed) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setZoomed(false);
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [zoomed]);

    const handleZoom = useCallback(() => {
        if (!disableZoom && !failed) setZoomed(true);
    }, [disableZoom, failed]);

    if (!src || failed) {
        return (
            <figure className={cn('not-prose my-8', className)}>
                <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-500">
                    <ImageOff className="h-8 w-8" aria-hidden="true" />
                    <span className="px-4 text-center text-xs">{altText}</span>
                </div>
                {caption && (
                    <figcaption className="mt-2 text-center text-sm italic text-gray-500 dark:text-gray-400">
                        {caption}
                    </figcaption>
                )}
            </figure>
        );
    }

    return (
        <>
            <figure className={cn('not-prose my-8', className)}>
                <div
                    className={cn(
                        'group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800',
                        !disableZoom && 'cursor-zoom-in',
                    )}
                    onClick={handleZoom}
                    role={disableZoom ? undefined : 'button'}
                    tabIndex={disableZoom ? undefined : 0}
                    onKeyDown={(event) => {
                        if (disableZoom) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setZoomed(true);
                        }
                    }}
                    aria-label={disableZoom ? undefined : `Enlarge image: ${altText}`}
                >
                    {!loaded && <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-800" />}

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt={altText}
                        loading="lazy"
                        decoding="async"
                        onLoad={() => setLoaded(true)}
                        onError={() => setFailed(true)}
                        className={cn(
                            'mx-auto block h-auto w-full max-w-full object-contain transition-opacity duration-300',
                            loaded ? 'opacity-100' : 'opacity-0',
                        )}
                    />

                    {!disableZoom && (
                        <span className="pointer-events-none absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                            <ZoomIn className="h-4 w-4" aria-hidden="true" />
                        </span>
                    )}
                </div>

                {caption && (
                    <figcaption className="mt-2.5 text-center text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                        {caption}
                    </figcaption>
                )}
            </figure>

            {zoomed && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200"
                    onClick={() => setZoomed(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={altText}
                >
                    <button
                        type="button"
                        onClick={() => setZoomed(false)}
                        aria-label="Close image"
                        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt={altText}
                        onClick={(event) => event.stopPropagation()}
                        className="max-h-[88vh] max-w-full rounded-lg object-contain shadow-2xl"
                    />

                    {caption && (
                        <p className="absolute bottom-6 left-1/2 max-w-2xl -translate-x-1/2 px-4 text-center text-sm text-white/80">
                            {caption}
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

export default ArticleImage;
