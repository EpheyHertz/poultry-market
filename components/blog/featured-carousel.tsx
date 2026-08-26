'use client';

// components/blog/featured-carousel.tsx
//
// Horizontally scrollable "Featured Posts" rail for the blog listing page.
//
// Why a scroll rail instead of a taller grid:
//  - The blog has many posts flagged `featured` in the database. Rendering them
//    all as a vertical grid pushes "All Articles" far below the fold; a snap
//    rail keeps the section a fixed height no matter how many featured posts
//    exist, while still making every one of them reachable.
//  - No new dependency: it reuses the `.featured-scroll` utility that already
//    lives in app/globals.css (hidden scrollbar + snap) and the existing
//    GridCard, so featured cards look identical to the rest of the blog.
//
// Ordering is never touched here — posts are rendered in exactly the order the
// data source returns them.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GridCard, type BlogCardPost } from '@/components/blog/cards';
import { GridCardSkeleton } from '@/components/blog/skeletons';
import { SectionHeader } from '@/components/blog/sections';

interface FeaturedCarouselProps {
    posts: BlogCardPost[];
    loading?: boolean;
    onPostClick?: (e: React.MouseEvent, post: BlogCardPost, position?: number) => void;
    className?: string;
}

/**
 * Slide width: ~1 card per view on mobile, ~2 on tablet, ~3 on desktop.
 * Fixed widths (rather than flex-basis) keep every slide identical so the snap
 * points stay predictable and the rail height never shifts.
 */
const SLIDE_WIDTH = 'w-[80vw] sm:w-[19rem] lg:w-[21rem]';

const ARROW_CLASS =
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-600 dark:hover:bg-slate-700 dark:hover:text-emerald-300 dark:focus-visible:ring-offset-slate-950 dark:disabled:hover:bg-slate-800 dark:disabled:hover:text-slate-200';

export function FeaturedCarousel({
    posts,
    loading = false,
    onPostClick,
    className,
}: FeaturedCarouselProps) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const syncArrows = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const maxScroll = el.scrollWidth - el.clientWidth;
        // 8px tolerance absorbs sub-pixel rounding at the track ends.
        setCanScrollLeft(el.scrollLeft > 8);
        setCanScrollRight(el.scrollLeft < maxScroll - 8);
    }, []);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;

        syncArrows();
        el.addEventListener('scroll', syncArrows, { passive: true });
        window.addEventListener('resize', syncArrows);
        return () => {
            el.removeEventListener('scroll', syncArrows);
            window.removeEventListener('resize', syncArrows);
        };
    }, [syncArrows, posts.length, loading]);

    const scrollByPage = (direction: -1 | 1) => {
        const el = scrollerRef.current;
        if (!el) return;
        // Scroll ~80% of the viewport so the next card is always partially visible,
        // which signals to the user that the rail continues.
        const amount = Math.max(el.clientWidth * 0.8, 260);
        el.scrollBy({ left: direction * amount, behavior: 'smooth' });
    };

    if (!loading && posts.length === 0) return null;

    return (
        <section aria-label="Featured Posts" className={cn('relative', className)}>
            <SectionHeader
                title="Featured Posts"
                icon={<Sparkles className="h-5 w-5" />}
                description={
                    loading
                        ? 'Loading editor picks…'
                        : `${posts.length} editor ${posts.length === 1 ? 'pick' : 'picks'} — swipe or scroll for more`
                }
                className="mb-3"
                action={
                    <div className="hidden items-center gap-2 sm:flex">
                        <button
                            type="button"
                            onClick={() => scrollByPage(-1)}
                            disabled={!canScrollLeft}
                            aria-label="Scroll featured posts left"
                            className={ARROW_CLASS}
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollByPage(1)}
                            disabled={!canScrollRight}
                            aria-label="Scroll featured posts right"
                            className={ARROW_CLASS}
                        >
                            <ChevronRight className="h-4 w-4" aria-hidden />
                        </button>
                    </div>
                }
            />

            <div className="relative">
                <div
                    ref={scrollerRef}
                    role="group"
                    aria-label="Featured posts carousel"
                    className="featured-scroll -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {loading
                        ? Array.from({ length: 3 }).map((_, i) => (
                            <div key={`featured-skeleton-${i}`} className={cn('flex-shrink-0 snap-start', SLIDE_WIDTH)}>
                                <GridCardSkeleton />
                            </div>
                        ))
                        : posts.map((post, index) => (
                            <article
                                key={post.id}
                                className={cn('relative flex-shrink-0 snap-start', SLIDE_WIDTH)}
                            >
                                {/* Featured marker — makes the section self-explanatory when
                      the same card also appears in All Articles. */}
                                <span className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm dark:bg-amber-500/90">
                                    <Star className="h-3 w-3 fill-current" aria-hidden />
                                    Featured
                                </span>
                                <GridCard
                                    post={post}
                                    onClick={onPostClick ? (e) => onPostClick(e, post, index) : undefined}
                                />
                            </article>
                        ))}
                </div>

                {/* Edge fades hint at more content. Pointer-events-none so they never
            swallow a card click. Colours follow the page surface in both themes. */}
                <div
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-slate-50 to-transparent transition-opacity dark:from-slate-950 sm:block',
                        canScrollLeft ? 'opacity-100' : 'opacity-0'
                    )}
                />
                <div
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-slate-50 to-transparent transition-opacity dark:from-slate-950 sm:block',
                        canScrollRight ? 'opacity-100' : 'opacity-0'
                    )}
                />
            </div>
        </section>
    );
}

export default FeaturedCarousel;
