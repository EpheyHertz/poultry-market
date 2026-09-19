'use client';

/**
 * ArticleHeader (§1, §2, §5, §11, §19, §25)
 *
 * Editorial masthead: breadcrumbs → category badge → H1 → standfirst →
 * author/meta row → action rail → featured image.
 *
 * Typography intentionally scales down hard on mobile (§2) and the H1 stays
 * the single H1 on the page (§25).
 */

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, Clock, Eye, History, ImageOff, Maximize2, ShieldCheck, X } from 'lucide-react';

import LikeButton from '@/components/blog/like-button';
import { cn } from '@/lib/utils';
import { formatArticleDate, formatReadingTime, formatViewLabel } from '@/lib/blog/article/format';
import type { ArticleView } from '@/lib/blog/article/types';

import { useArticleAnalytics } from './article-analytics';
import ShareButtons from './share-buttons';

interface ArticleHeaderProps {
    article: ArticleView;
    className?: string;
}

function AuthorAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
    const [failed, setFailed] = useState(false);
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

    if (!avatarUrl || failed) {
        return (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white">
                {initials || 'PM'}
            </span>
        );
    }

    return (
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-gray-900">
            {/* Avatars come from arbitrary hosts, so a plain img with a graceful fallback is safer than next/image here (§27). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={avatarUrl}
                alt={name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
                className="h-full w-full object-cover"
            />
        </span>
    );
}

function FeaturedImage({ src, alt }: { src: string; alt: string }) {
    const [failed, setFailed] = useState(false);
    const [open, setOpen] = useState(false);

    const close = useCallback(() => setOpen(false), []);

    // Escape closes the lightbox; lock body scroll while it is open so the
    // page behind never scrolls on touch devices (§11, §23).
    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        document.addEventListener('keydown', onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, close]);

    if (failed) {
        return (
            <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <ImageOff className="h-8 w-8 text-gray-400" aria-hidden="true" />
            </div>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="View featured image full size"
                className="group relative block aspect-[16/9] w-full cursor-zoom-in overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-gray-800 dark:ring-white/10 dark:focus-visible:ring-offset-gray-950"
            >
                <Image
                    src={src}
                    alt={alt}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1100px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    onError={() => setFailed(true)}
                />
                {/* Expand affordance — visible on touch, reinforced on hover (§11). */}
                <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white opacity-90 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                    View full size
                </span>
            </button>

            {open ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Full size featured image"
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"
                    onClick={close}
                >
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close full size image"
                        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6 sm:top-6"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {/* Plain img so the lightbox can show the original at its natural
                        resolution rather than a next/image optimised variant. */}
                    <div
                        className="relative max-h-full w-full max-w-6xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={src}
                            alt={alt}
                            className="mx-auto max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                        />
                        <p className="mt-3 text-center text-sm text-white/80">{alt}</p>
                    </div>
                </div>
            ) : null}
        </>
    );
}

export function ArticleHeader({ article, className }: ArticleHeaderProps) {
    const analytics = useArticleAnalytics();
    const publishedLabel = formatArticleDate(article.publishedAt);
    const updatedLabel = article.showUpdatedAt ? formatArticleDate(article.updatedAt) : null;

    return (
        <header className={cn('space-y-6', className)}>
            {/* Breadcrumbs (§1) — visual trail; the JSON-LD version lives on the server page (§25). */}
            <nav aria-label="Breadcrumb" className="text-[13px] text-gray-500 dark:text-gray-400">
                <ol className="flex flex-wrap items-center gap-1">
                    <li>
                        <Link href="/" className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                            Home
                        </Link>
                    </li>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                    <li>
                        <Link href="/blog" className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                            Blog
                        </Link>
                    </li>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                    <li>
                        <Link
                            href={article.categoryHref}
                            className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                            {article.categoryLabel}
                        </Link>
                    </li>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                    <li className="max-w-full truncate font-medium text-gray-700 dark:text-gray-200" aria-current="page">
                        {article.title}
                    </li>
                </ol>
            </nav>

            <div className="space-y-4">
                <Link
                    href={article.categoryHref}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                >
                    {article.categoryIcon ? <span aria-hidden="true">{article.categoryIcon}</span> : null}
                    {article.categoryLabel}
                </Link>

                {/* The single H1 for the document (§25). */}
                <h1 className="text-[1.75rem] font-extrabold leading-[1.18] tracking-[-0.02em] text-gray-900 sm:text-[2.125rem] lg:text-[2.75rem] lg:leading-[1.12] dark:text-white">
                    {article.title}
                </h1>

                {article.excerpt ? (
                    <p className="max-w-[46rem] text-[1.0625rem] leading-[1.6] text-gray-600 sm:text-[1.125rem] dark:text-gray-300">
                        {article.excerpt}
                    </p>
                ) : null}
            </div>

            {/* Author + metadata (§2) */}
            <div className="flex flex-col gap-4 border-y border-gray-100 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <AuthorAvatar name={article.author.name} avatarUrl={article.author.avatarUrl} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm text-gray-500 dark:text-gray-400">By</span>
                            {article.author.href ? (
                                <Link
                                    href={article.author.href}
                                    className="truncate text-sm font-semibold text-gray-900 transition-colors hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400"
                                >
                                    {article.author.name}
                                </Link>
                            ) : (
                                <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                    {article.author.name}
                                </span>
                            )}
                            {article.author.isVerified ? (
                                <ShieldCheck
                                    className="h-4 w-4 shrink-0 text-emerald-500"
                                    aria-label="Verified author"
                                />
                            ) : null}
                        </div>

                        {/* Professional title (author-spec §13) — credibility line, one source of truth. */}
                        {article.author.professionalTitle ? (
                            <p className="mt-0.5 truncate text-[12.5px] font-medium text-emerald-700 dark:text-emerald-400">
                                {article.author.professionalTitle}
                            </p>
                        ) : null}

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-gray-500 dark:text-gray-400">

                            {publishedLabel ? (
                                <span className="inline-flex items-center gap-1">
                                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>
                                        Published{' '}
                                        <time dateTime={article.publishedAt ?? undefined}>{publishedLabel}</time>
                                    </span>
                                </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                {formatReadingTime(article.readingTime)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                {formatViewLabel(article.views)}
                            </span>
                            {updatedLabel ? (
                                <span className="inline-flex items-center gap-1">
                                    <History className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>
                                        Updated <time dateTime={article.updatedAt ?? undefined}>{updatedLabel}</time>
                                    </span>
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Compact action rail — mobile share row (§11, §23). */}
                <div className="flex items-center gap-2 sm:shrink-0">
                    <LikeButton postId={article.id} slug={article.slug} initialCount={article.likes} />
                    <ShareButtons
                        url={article.canonicalUrl}
                        title={article.title}
                        variant="row"
                        onShare={analytics.trackShare}
                    />
                </div>
            </div>

            {article.featuredImage ? <FeaturedImage src={article.featuredImage} alt={article.title} /> : null}
        </header>
    );
}

export default ArticleHeader;
