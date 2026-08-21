'use client';

/**
 * RecommendedPosts (§15, §17, §29)
 *
 * Pure presentation: the ranking, de-duplication and current-article exclusion
 * all happen server-side in `lib/blog/article/recommendations.ts`.
 *
 * Defence in depth: this component re-filters by `currentArticleId` and drops
 * repeated ids, so the current article can never render inside its own
 * recommendations even if a caller passes an unfiltered list. When nothing is
 * left, the section renders nothing at all rather than an empty shell (§17).
 */

import { cn } from '@/lib/utils';
import type { RecommendedArticle } from '@/lib/blog/article/recommendations';

import RecommendedPostCard, { type RecommendedCardVariant } from './recommended-post-card';

interface RecommendedPostsProps {
    articles: RecommendedArticle[];
    /** Hard exclusion guard (§29). */
    currentArticleId: string;
    variant?: RecommendedCardVariant;
    title?: string;
    description?: string;
    placement?: string;
    limit?: number;
    className?: string;
}

export function filterRecommendations(
    articles: RecommendedArticle[],
    currentArticleId: string,
    limit?: number,
): RecommendedArticle[] {
    const seen = new Set<string>();
    const result: RecommendedArticle[] = [];

    for (const article of articles) {
        // §29: currentArticleId !== recommendedArticle.id
        if (!article || article.id === currentArticleId) continue;
        if (seen.has(article.id)) continue;
        seen.add(article.id);
        result.push(article);
        if (limit && result.length >= limit) break;
    }

    return result;
}

export function RecommendedPosts({
    articles,
    currentArticleId,
    variant = 'bottom',
    title,
    description,
    placement,
    limit,
    className,
}: RecommendedPostsProps) {
    const items = filterRecommendations(articles, currentArticleId, limit);

    // §17 empty state: render nothing instead of an empty heading.
    if (items.length === 0) return null;

    const gridClass =
        variant === 'bottom'
            ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'
            : variant === 'sidebar'
                ? 'flex flex-col gap-1'
                : 'flex flex-col gap-3';

    return (
        <section className={cn('space-y-4', className)} aria-label={title ?? 'Recommended articles'}>
            {title ? (
                <div className="space-y-1">
                    <h2
                        className={cn(
                            'font-bold text-gray-900 dark:text-white',
                            variant === 'sidebar'
                                ? 'text-[11px] uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400'
                                : 'text-xl sm:text-2xl',
                        )}
                    >
                        {title}
                    </h2>
                    {description ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                    ) : null}
                </div>
            ) : null}

            <div className={gridClass}>
                {items.map((article) => (
                    <RecommendedPostCard
                        key={article.id}
                        article={article}
                        variant={variant}
                        placement={placement}
                    />
                ))}
            </div>
        </section>
    );
}

export default RecommendedPosts;
