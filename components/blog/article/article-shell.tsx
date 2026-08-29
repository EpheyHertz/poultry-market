'use client';

/**
 * ArticleShell (§1, §11, §17, §23, §24, §28)
 *
 * Composition root for the reading experience. It only arranges the modular
 * pieces — no Markdown parsing, no data fetching, no analytics logic:
 *
 *   ReadingProgress
 *   ArticleHeader            (breadcrumbs → category → H1 → excerpt → meta → image)
 *   [ ArticleContent | ArticleSidebar ]   ← 2-col ≥1024px, 1-col below
 *   Tags · Author card · postBottom ad
 *   RecommendedPosts (bottom)
 *   Comments
 *
 * Desktop grid keeps the article column at the 680–760px measure required by §1
 * and §5; the sidebar narrows on tablet (§24) and disappears below `lg` (§23).
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUp, Mail, MessageCircle, Package, ShieldCheck, Tag } from 'lucide-react';

import AdSlot from '@/components/ads/ad-slot';
import { trackEvent } from '@/components/analytics/google-analytics';
import { AuthorResourcesSection } from '@/components/author/author-resource-card';
import AuthorSocialLinks from '@/components/author/author-social-links';
import BlogComments from '@/components/blog/blog-comments';
import FollowButton from '@/components/blog/follow-button';
import SupportButton from '@/components/blog/SupportButton';
import { cn } from '@/lib/utils';

import type { ArticleHeading } from '@/lib/blog/article/content';
import { formatCompactNumber } from '@/lib/blog/article/format';
import type { RecommendedArticle } from '@/lib/blog/article/recommendations';
import type { ArticleView } from '@/lib/blog/article/types';

import { ArticleAnalyticsProvider } from './article-analytics';
import ArticleContent from './article-content';
import ArticleHeader from './article-header';
import ArticleSidebar from './article-sidebar';
import ReadingProgress from './reading-progress';
import RecommendedPostCard from './recommended-post-card';
import RecommendedPosts from './recommended-posts';
import ShareButtons from './share-buttons';
import TableOfContents from './table-of-contents';

const CONTENT_ID = 'article-content';

interface ArticleShellProps {
    article: ArticleView;
    headings: ArticleHeading[];
    sidebarRecommendations: RecommendedArticle[];
    bottomRecommendations: RecommendedArticle[];
    /** In-content interlinks, rendered between sections (§17). */
    inArticleRecommendations: RecommendedArticle[];
}

/** Subtle back-to-top affordance — one button, no scroll hijacking (§30). */
function ScrollToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // One passive listener; state only changes when crossing the threshold.
        const onScroll = () => {
            const shouldShow = window.scrollY > 1200;
            setVisible((current) => (current === shouldShow ? current : shouldShow));
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            className={cn(
                'fixed bottom-6 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-lg backdrop-blur transition-all duration-300 hover:border-emerald-300 hover:text-emerald-600 dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-300 sm:bottom-8 sm:right-8',
                visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
            )}
        >
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
        </button>
    );
}

/**
 * End-of-article author card (author-spec §14, §16).
 *
 * Everything shown here comes from the same author record that powers the
 * public profile page — no hard-coded or duplicated author data (§34).
 * Socials use the shared `AuthorSocialLinks` component so the article surface
 * and the profile page can never drift apart (§4).
 */
function AuthorCard({ article }: { article: ArticleView }) {
    const { author } = article;
    const initials = author.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
    // §13 — the professional title is the credibility line; tagline is the fallback.
    const roleLine = author.professionalTitle || author.tagline;
    const firstName = author.name.split(/\s+/).filter(Boolean)[0] || author.name;

    const trackAuthorClick = (event: string, extra?: Record<string, string | number>) => {
        trackEvent(event, {
            author_username: author.username ?? undefined,
            source: 'article_author_card',
            article_id: article.id,
            ...extra,
        });
    };

    return (
        <section
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6"
            aria-label="About the author"
        >

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={author.avatarUrl}
                        alt={author.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
                    />
                ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-base font-semibold text-white">
                        {initials || 'PM'}
                    </span>
                )}

                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                            Written by
                        </span>
                        {author.isVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                                Verified
                            </span>
                        ) : null}
                    </div>

                    {author.href ? (
                        <Link
                            href={author.href}
                            className="block text-lg font-bold text-gray-900 transition-colors hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400"
                        >
                            {author.name}
                        </Link>
                    ) : (
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{author.name}</p>
                    )}

                    {roleLine ? (
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{roleLine}</p>
                    ) : null}

                    {author.bio ? (
                        <p className="line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                            {author.bio}
                        </p>
                    ) : null}

                    {/* Real counters only — never fabricated, and hidden while still empty (§18, §32). */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-gray-500 dark:text-gray-400">
                        <span>
                            <strong className="font-semibold text-gray-900 dark:text-gray-200">
                                {formatCompactNumber(author.posts)}
                            </strong>{' '}
                            {author.posts === 1 ? 'article' : 'articles'}
                        </span>
                        {author.followers > 0 ? (
                            <span>
                                <strong className="font-semibold text-gray-900 dark:text-gray-200">
                                    {formatCompactNumber(author.followers)}
                                </strong>{' '}
                                {author.followers === 1 ? 'follower' : 'followers'}
                            </span>
                        ) : null}
                    </div>


                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <FollowButton
                            userId={author.id}
                            onFollowChange={(following) =>
                                following ? trackAuthorClick('author_follow') : undefined
                            }
                        />
                        {author.href ? (
                            <Link
                                href={author.href}
                                onClick={() => trackAuthorClick('author_profile_click')}
                                className="inline-flex h-9 items-center rounded-full border border-gray-200 px-4 text-sm font-medium text-gray-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:text-gray-200 dark:hover:border-emerald-700 dark:hover:text-emerald-400 dark:focus-visible:ring-offset-gray-900"
                            >
                                View profile
                            </Link>
                        ) : null}
                        {author.profileId || author.username ? (
                            <SupportButton
                                authorId={author.profileId || author.username || ''}
                                authorName={author.name}
                                blogPostId={article.id}
                                blogPostTitle={article.title}
                                variant="compact"
                            />
                        ) : null}
                    </div>

                    {/*
                     * Socials + opt-in contact (§14, §16). Rendered only when the author
                     * actually has them, so the card never shows an empty row (§32).
                     * `contactEmail` is already gated on the author's own opt-in (§3) —
                     * private account emails never reach this component.
                     */}
                    {author.socialLinks.length > 0 ||
                        author.contactEmail ||
                        (author.hasResources && author.href) ? (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <AuthorSocialLinks
                                links={author.socialLinks}
                                authorName={author.name}
                                size="sm"
                                onLinkClick={(platform) =>
                                    trackAuthorClick('author_social_click', { platform })
                                }
                            />
                            {author.contactEmail ? (
                                <a
                                    href={`mailto:${author.contactEmail}`}
                                    onClick={() => trackAuthorClick('author_email_click')}
                                    className="inline-flex min-h-[36px] items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:text-emerald-400 dark:focus-visible:ring-offset-gray-900"
                                >
                                    <Mail className="h-4 w-4" aria-hidden="true" />
                                    <span>Email {firstName}</span>
                                </a>
                            ) : null}
                            {/*
                             * ext §12 — the author card gets a *link*, never a grid of
                             * recommendation cards. The full section lives on the profile,
                             * so a reader is never shown products unrelated to the article.
                             */}
                            {author.hasResources && author.href ? (
                                <Link
                                    href={`${author.href}#author-resources`}
                                    onClick={() =>
                                        trackAuthorClick('author_resources_click', {
                                            placement: 'author_card',
                                        })
                                    }
                                    className="inline-flex min-h-[36px] items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:text-emerald-400 dark:focus-visible:ring-offset-gray-900"
                                >
                                    <Package className="h-4 w-4" aria-hidden="true" />
                                    <span>Recommended resources</span>
                                    <span aria-hidden="true">&rarr;</span>
                                </Link>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}


export function ArticleShell({
    article,
    headings,
    sidebarRecommendations,
    bottomRecommendations,
    inArticleRecommendations,
}: ArticleShellProps) {
    /*
     * In-content slots (§17): one related-article link per section boundary, so
     * the reader always has a next step without leaving the flow. The inline ad
     * rides along with the first slot only — never repeated.
     */
    const inlineSlots = inArticleRecommendations
        // §29 defence in depth: the current article can never link to itself.
        .filter((item) => item.id !== article.id)
        .map((item, index) => (
            <div key={item.id} className="space-y-6">
                <RecommendedPostCard article={item} variant="inline" placement="in-article" />
                {index === 0 ? <AdSlot name="postInline" /> : null}
            </div>
        ));

    return (
        <ArticleAnalyticsProvider
            postId={article.id}
            slug={article.slug}
            title={article.title}
            category={article.category}
            authorUsername={article.author.username}
            targetId={CONTENT_ID}
        >
            {/* §3 — thin bar measured from the article container, above the navbar. */}
            <ReadingProgress targetId={CONTENT_ID} />

            <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-10">
                <ArticleHeader article={article} />

                {/* Mobile / tablet collapsible TOC (§6, §23). */}
                <div className="mt-6 lg:hidden">
                    <TableOfContents headings={headings} variant="mobile" />
                </div>

                {/*
                 * §1 desktop grid: article measure + generous gutter + 300px rail.
                 * `minmax(0, …)` prevents wide code blocks/tables from stretching the column.
                 */}
                <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-16">
                    <div className="min-w-0">
                        <div className="relative">
                            {/* §11 floating share rail — only where there is real room for it. */}
                            <div className="pointer-events-none absolute -left-20 top-2 hidden xl:block">
                                <div className="pointer-events-auto sticky top-28">
                                    <ShareButtons
                                        url={article.canonicalUrl}
                                        title={article.title}
                                        variant="rail"
                                    />
                                </div>
                            </div>

                            <article className="mx-auto w-full max-w-[46rem]">
                                <ArticleContent
                                    content={article.content}
                                    id={CONTENT_ID}
                                    inlineSlots={
                                        inlineSlots.length
                                            ? inlineSlots
                                            : [<AdSlot key="postInline" name="postInline" />]
                                    }
                                />
                            </article>
                        </div>

                        <div className="mx-auto mt-10 w-full max-w-[46rem] space-y-8">
                            {article.tags.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Tag className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                    {article.tags.map((tag) => (
                                        <Link
                                            key={tag.id}
                                            href={`/blog?tag=${encodeURIComponent(tag.slug)}`}
                                            className="rounded-full bg-gray-100 px-3 py-1 text-[12.5px] font-medium text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                                        >
                                            #{tag.name}
                                        </Link>
                                    ))}
                                </div>
                            ) : null}

                            {/* Share again at the end of the read — the natural sharing moment. */}
                            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Found this useful? Share it with a fellow farmer.
                                </p>
                                <ShareButtons url={article.canonicalUrl} title={article.title} variant="row" />
                            </div>

                            {/*
                             * ext §12 / §13 — only resources the author *deliberately
                             * attached to this article*. Empty for most posts, and the
                             * section renders nothing when empty (§29), so no article is
                             * ever padded out with unrelated products.
                             */}
                            <AuthorResourcesSection
                                resources={article.resources}
                                authorName={article.author.name}
                                authorId={article.author.id}
                                articleId={article.id}
                                placement="article"
                                columns={2}
                            />

                            <AuthorCard article={article} />

                            <AdSlot name="postBottom" />
                        </div>
                    </div>

                    <ArticleSidebar
                        headings={headings}
                        recommendations={sidebarRecommendations}
                        currentArticleId={article.id}
                    />
                </div>

                {/* §17 — 3 large cards below the article, full container width. */}
                <RecommendedPosts
                    articles={bottomRecommendations}
                    currentArticleId={article.id}
                    variant="bottom"
                    title="Recommended articles"
                    description="More poultry farming insights picked for this topic."
                    placement="article-bottom"
                    limit={3}
                    className="mt-14 border-t border-gray-200 pt-10 dark:border-gray-800"
                />

                <section
                    className="mt-14 border-t border-gray-200 pt-10 dark:border-gray-800"
                    aria-label="Comments"
                >
                    <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                        <MessageCircle className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                        Discussion
                        {article.commentCount > 0 ? (
                            <span className="text-base font-medium text-gray-400">({article.commentCount})</span>
                        ) : null}
                    </h2>
                    <BlogComments postId={article.id} />
                </section>
            </div>

            <ScrollToTop />
        </ArticleAnalyticsProvider>
    );
}

export default ArticleShell;
