'use client';

/**
 * LinkPreview (§8, §26, §27)
 *
 * Turns a bare URL in the Markdown into a rich card. Metadata comes from our
 * own cached endpoint (`/api/blog/link-preview`) so no third-party script runs
 * in the reader's browser and no external request blocks page render.
 *
 * Progressive enhancement:
 *   - First paint: clean domain + URL card (works with JS disabled).
 *   - Then: title / description / image / favicon fill in if available.
 *   - On any failure: the first-paint card simply stays (§27).
 *
 * The fetch is deferred until the card scrolls near the viewport so
 * link-heavy articles do not fire a burst of requests on load.
 */

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Globe, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { prettyHostname } from '@/lib/blog/article/format';
import type { LinkPreviewData } from '@/lib/blog/article/link-preview';

interface LinkPreviewProps {
    url: string;
    className?: string;
    /** Server-resolved metadata; skips the client fetch entirely when given. */
    initialData?: LinkPreviewData | null;
    /** Fired when the reader opens the link (analytics §13). */
    onOpen?: (url: string) => void;
}

export function LinkPreview({ url, className, initialData, onOpen }: LinkPreviewProps) {
    const [data, setData] = useState<LinkPreviewData | null>(initialData ?? null);
    const [imageFailed, setImageFailed] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const domain = data?.domain || prettyHostname(url);

    useEffect(() => {
        // Already resolved server-side — nothing to do.
        if (initialData) return;

        const node = containerRef.current;
        if (!node || typeof window === 'undefined') return;

        let cancelled = false;
        const controller = new AbortController();

        const load = async () => {
            try {
                const response = await fetch(
                    `/api/blog/link-preview?url=${encodeURIComponent(url)}`,
                    { signal: controller.signal },
                );
                if (!response.ok) return;

                const payload = (await response.json()) as LinkPreviewData;
                // The endpoint always returns a usable payload; only upgrade the
                // card when it actually carries metadata.
                if (!cancelled && payload?.resolved) setData(payload);
            } catch {
                // Silent by design: the fallback card is already rendered.
            }
        };

        if (!('IntersectionObserver' in window)) {
            void load();
            return () => {
                cancelled = true;
                controller.abort();
            };
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    observer.disconnect();
                    void load();
                }
            },
            { rootMargin: '300px 0px' },
        );

        observer.observe(node);

        return () => {
            cancelled = true;
            controller.abort();
            observer.disconnect();
        };
    }, [initialData, url]);

    const showImage = Boolean(data?.image) && !imageFailed;

    return (
        <div ref={containerRef} className={cn('not-prose my-6', className)}>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOpen?.(url)}
                className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white no-underline transition-all duration-200 hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700 sm:flex-row"
            >
                {showImage && (
                    <div className="relative w-full shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 sm:h-auto sm:w-44">
                        <div className="aspect-[16/9] w-full sm:h-full sm:aspect-auto sm:min-h-[132px]">
                            {/* Arbitrary remote host: next/image remotePatterns
                                cannot cover the open web, so a plain img is right. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={data?.image ?? ''}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                onError={() => setImageFailed(true)}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            />
                        </div>
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-4">
                    <div className="min-w-0">
                        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {data?.favicon ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={data.favicon}
                                    alt=""
                                    width={14}
                                    height={14}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="h-3.5 w-3.5 rounded-sm object-contain"
                                    onError={(event) => {
                                        event.currentTarget.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            <span className="truncate">{data?.siteName || domain || 'Website'}</span>
                        </div>

                        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-emerald-700 dark:text-gray-100 dark:group-hover:text-emerald-300">
                            {data?.title || domain || url}
                        </p>

                        {data?.description ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                {data.description}
                            </p>
                        ) : (
                            !data?.title && (
                                <p className="mt-1 flex items-center gap-1.5 break-all text-sm text-gray-500 dark:text-gray-400">
                                    <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    <span className="line-clamp-1">{url}</span>
                                </p>
                            )
                        )}
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {domain}
                        <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                </div>
            </a>
        </div>
    );
}

export default LinkPreview;
