'use client';

/**
 * RecommendedPostCard (§18)
 *
 * Three purpose-built variants instead of reusing the homepage card:
 *   - `sidebar` — thumbnail + title + reading time (compact, 3–5 per rail)
 *   - `bottom`  — image, category, title, excerpt, reading time + views
 *   - `inline`  — slim horizontal card for the optional mid-article slot
 */

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Clock, Eye, Newspaper } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCompactNumber, formatReadingTime, truncate } from '@/lib/blog/article/format';
import type { RecommendedArticle } from '@/lib/blog/article/recommendations';
import { BLOG_CATEGORIES } from '@/types/blog';

import { useArticleAnalytics } from './article-analytics';

export type RecommendedCardVariant = 'sidebar' | 'bottom' | 'inline';

interface RecommendedPostCardProps {
    article: RecommendedArticle;
    variant?: RecommendedCardVariant;
    placement?: string;
    className?: string;
}

function categoryLabel(category: string): string {
    return BLOG_CATEGORIES[category as keyof typeof BLOG_CATEGORIES]?.name ?? category.replace(/_/g, ' ');
}

/**
 * Thumbnails come from Cloudinary *and* arbitrary legacy hosts, so a plain
 * <img> with an onError fallback is the resilient choice here (§27).
 */
function CardImage({
    src,
    alt,
    className,
}: {
    src: string | null;
    alt: string;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div
                className={cn(
                    'flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-800',
                    className,
                )}
            >
                <Newspaper className="h-5 w-5 text-emerald-400/70" aria-hidden="true" />
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={cn('object-cover transition-transform duration-500 group-hover:scale-[1.04]', className)}
        />
    );
}

function MetaRow({ article, className }: { article: RecommendedArticle; className?: string }) {
    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-500 dark:text-gray-400',
                className,
            )}
        >
            <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatReadingTime(article.readingTime ?? 1)}
            </span>
            {article.views > 0 ? (
                <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatCompactNumber(article.views)} views
                </span>
            ) : null}
        </div>
    );
}

export function RecommendedPostCard({
    article,
    variant = 'bottom',
    placement,
    className,
}: RecommendedPostCardProps) {
    const analytics = useArticleAnalytics();

    const handleClick = () => {
        analytics.trackRecommendedClick({
            slug: article.slug,
            title: article.title,
            placement: placement ?? variant,
        });
    };

    if (variant === 'sidebar') {
        return (
            <Link
                href={article.href}
                onClick={handleClick}
                className={cn(
                    'group flex gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60',
                    className,
                )}
            >
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    <CardImage
                        src={article.thumbnail ?? article.featuredImage}
                        alt={article.title}
                        className="h-full w-full"
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-gray-900 transition-colors group-hover:text-emerald-600 dark:text-gray-100 dark:group-hover:text-emerald-400">
                        {article.title}
                    </h4>
                    <MetaRow article={article} className="mt-1.5" />
                </div>
            </Link>
        );
    }

    if (variant === 'inline') {
        // Mobile: stacked and compact. Desktop (sm+): horizontal so the card
        // stays short and never dominates the reading column (§18).
        return (
            <aside
                className={cn(
                    'not-prose rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06] sm:p-4',
                    className,
                )}
                aria-label="Related article"
            >
                <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                    Related reading
                </p>
                <Link
                    href={article.href}
                    onClick={handleClick}
                    className="group flex flex-col gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50 dark:focus-visible:ring-offset-gray-900 sm:flex-row sm:items-start sm:gap-4"
                >
                    <div className="aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl bg-white dark:bg-gray-800 sm:aspect-auto sm:h-[76px] sm:w-32">
                        <CardImage
                            src={article.thumbnail ?? article.featuredImage}
                            alt={article.title}
                            className="h-full w-full"
                        />
                    </div>

                    <div className="min-w-0 flex-1">
                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                            {categoryLabel(article.category)}
                        </span>
                        <h4 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 transition-colors group-hover:text-emerald-700 dark:text-gray-100 dark:group-hover:text-emerald-400">
                            {article.title}
                        </h4>
                        {article.excerpt ? (
                            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                                {truncate(article.excerpt, 110)}
                            </p>
                        ) : null}

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {article.authorName ? (
                                <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400">
                                    {article.authorAvatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={article.authorAvatarUrl}
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            referrerPolicy="no-referrer"
                                            className="h-4 w-4 rounded-full object-cover"
                                        />
                                    ) : null}
                                    {article.authorName}
                                </span>
                            ) : null}
                            <MetaRow article={article} />
                        </div>

                        <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                            Read more
                            <ArrowRight
                                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                                aria-hidden="true"
                            />
                        </span>
                    </div>
                </Link>
            </aside>
        );
    }


    return (
        <Link
            href={article.href}
            onClick={handleClick}
            className={cn(
                'group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-500/30',
                className,
            )}
        >
            <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                <CardImage
                    src={article.featuredImage ?? article.thumbnail}
                    alt={article.title}
                    className="h-full w-full"
                />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                    {categoryLabel(article.category)}
                </span>
                <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                    {article.title}
                </h3>
                {article.excerpt ? (
                    <p className="line-clamp-2 text-[13.5px] leading-relaxed text-gray-600 dark:text-gray-400">
                        {truncate(article.excerpt, 120)}
                    </p>
                ) : null}
                <MetaRow article={article} className="mt-auto pt-2" />
            </div>
        </Link>
    );
}

export default RecommendedPostCard;
