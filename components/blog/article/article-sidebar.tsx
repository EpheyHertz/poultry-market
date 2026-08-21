'use client';

/**
 * ArticleSidebar (§1, §6, §17, §24)
 *
 * Sticky right rail: "On this page" → compact recommendations → optional ad.
 * Hidden below `lg` (mobile gets the collapsible TOC instead) and narrowed on
 * tablet by the parent grid so the article column keeps its 680–760px measure.
 */

import AdSlot from '@/components/ads/ad-slot';
import { cn } from '@/lib/utils';
import type { ArticleHeading } from '@/lib/blog/article/content';
import type { RecommendedArticle } from '@/lib/blog/article/recommendations';

import RecommendedPosts from './recommended-posts';
import TableOfContents from './table-of-contents';

interface ArticleSidebarProps {
    headings: ArticleHeading[];
    recommendations: RecommendedArticle[];
    currentArticleId: string;
    /** Renders the sidebar ad slot only when ads are wanted on this page. */
    showAd?: boolean;
    className?: string;
}

export function ArticleSidebar({
    headings,
    recommendations,
    currentArticleId,
    showAd = true,
    className,
}: ArticleSidebarProps) {
    const hasToc = headings.length >= 3;
    const hasRecommendations = recommendations.length > 0;

    if (!hasToc && !hasRecommendations && !showAd) return null;

    return (
        <aside className={cn('hidden lg:block', className)} aria-label="Article sidebar">
            {/* top-24 clears the fixed navbar; the rail scrolls independently on short viewports. */}
            <div className="sticky top-24 space-y-6 overflow-y-auto pb-10 [max-height:calc(100vh-7rem)] [scrollbar-width:thin]">
                {hasToc ? <TableOfContents headings={headings} variant="sidebar" /> : null}

                {hasRecommendations ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <RecommendedPosts
                            articles={recommendations}
                            currentArticleId={currentArticleId}
                            variant="sidebar"
                            title="Recommended"
                            placement="sidebar"
                        />
                    </div>
                ) : null}

                {showAd ? <AdSlot name="blogSidebar" /> : null}
            </div>
        </aside>
    );
}

export default ArticleSidebar;
