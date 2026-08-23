'use client';

/**
 * Author recommended-resource card + section (§8, §27, §28, §29).
 *
 * One component powers every surface — the author profile, the end-of-article
 * author card and article bodies — so a resource looks and behaves identically
 * wherever it appears (single source of truth).
 *
 * Deliberate choices:
 *  - Reuses the Poultry Market card language (rounded-xl border, white /
 *    gray-900 surface, emerald accent) rather than inventing a "shop" look.
 *    It reads "Recommended by the author", never "Buy from Amazon" (§8).
 *  - All metadata is *stored*. Nothing here fetches the merchant at render
 *    time (§24).
 *  - `rel="sponsored"` is applied only to links the author declared as
 *    affiliate (§11), and the destination URL is passed through untouched so
 *    affiliate attribution survives (§21).
 *  - A missing or broken image degrades to a domain plate — never a broken
 *    image icon (§19).
 *  - Nothing renders when there are no resources: no empty headings, no empty
 *    boxes (§29).
 */

import { useState } from 'react';
import { ArrowUpRight, Package } from 'lucide-react';

import { cn } from '@/lib/utils';
import { trackEvent } from '@/components/analytics/google-analytics';
import {
    resourceDisclosure,
    resourceLinkRel,
    resourceMerchantLabel,
    type AuthorResourceView,
} from '@/lib/author-resources';

/** Where the card is being rendered — reported with the click event (§22). */
export type ResourcePlacement = 'author_profile' | 'article' | 'author_card';

interface AuthorResourceCardProps {
    resource: AuthorResourceView;
    /** Author profile id, for attribution in analytics. */
    authorId?: string | null;
    /** Present when the card sits inside an article (§22). */
    articleId?: string | null;
    placement: ResourcePlacement;
    /** `compact` drops the image — used in tight spots like the author card. */
    variant?: 'default' | 'compact';
    className?: string;
}

/**
 * Report an outbound click.
 *
 * Two independent, non-blocking signals:
 *  1. `trackEvent` — the existing GA pipeline (§22). No new analytics stack.
 *  2. A `keepalive` POST that bumps the author's own click counter.
 *
 * Neither is awaited and neither can cancel the navigation. We send the
 * merchant/domain but not the affiliate URL — it adds nothing and could leak
 * the author's tracking id into analytics (§22).
 */
function reportResourceClick(
    resource: AuthorResourceView,
    placement: ResourcePlacement,
    authorId?: string | null,
    articleId?: string | null,
) {
    try {
        trackEvent('affiliate_resource_click', {
            resource_id: resource.id,
            author_id: authorId ?? undefined,
            article_id: articleId ?? undefined,
            merchant: resourceMerchantLabel(resource.merchant, resource.domain),
            domain: resource.domain,
            is_affiliate: resource.isAffiliate,
            placement,
        });
    } catch {
        // Analytics must never interfere with the reader leaving the page.
    }

    try {
        void fetch(`/api/author/resources/${encodeURIComponent(resource.id)}/click`, {
            method: 'POST',
            keepalive: true,
        }).catch(() => undefined);
    } catch {
        // Ditto.
    }
}

export function AuthorResourceCard({
    resource,
    authorId,
    articleId,
    placement,
    variant = 'default',
    className,
}: AuthorResourceCardProps) {
    const [imageFailed, setImageFailed] = useState(false);

    const merchant = resourceMerchantLabel(resource.merchant, resource.domain);
    const disclosure = resourceDisclosure(resource.isAffiliate, resource.affiliateDisclosure);
    const showImage = Boolean(resource.imageUrl) && !imageFailed && variant === 'default';

    return (
        <article
            className={cn(
                'group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200',
                'hover:border-emerald-300 hover:shadow-md',
                'dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700',
                className,
            )}
        >
            {showImage ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {/* Merchant images come from the open web, which next/image
                        remotePatterns cannot enumerate — a plain img with lazy
                        loading is the correct tool here (§30 performance). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={resource.imageUrl ?? ''}
                        alt={resource.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={() => setImageFailed(true)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                </div>
            ) : variant === 'default' ? (
                // Domain plate instead of a broken image (§19).
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-gray-50 dark:bg-gray-800/60">
                    <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                        <Package
                            className="h-6 w-6 text-gray-400 dark:text-gray-500"
                            aria-hidden="true"
                        />
                        <span className="line-clamp-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            {merchant}
                        </span>
                    </div>
                </div>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Merchant stays subtle and never invented — falls back to
                        the domain when we cannot identify it (§9). */}
                    <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {merchant}
                    </span>
                    {resource.isAffiliate ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            Affiliate
                        </span>
                    ) : null}
                </div>

                <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 dark:text-gray-100">
                    {resource.title}
                </h3>

                {resource.description ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        {resource.description}
                    </p>
                ) : null}

                <a
                    href={resource.url}
                    target="_blank"
                    // `sponsored` only when the author declared it (§11).
                    rel={resourceLinkRel(resource.isAffiliate)}
                    onClick={() => reportResourceClick(resource, placement, authorId, articleId)}
                    // The whole card is clickable, but the accessible name lives
                    // on this link so it never reads as just "View" (§31).
                    aria-label={`View recommendation: ${resource.title} on ${merchant} (opens in a new tab)`}
                    className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-emerald-400 dark:hover:text-emerald-300 dark:focus-visible:ring-offset-gray-900"
                >
                    {/* Stretches the hit area over the card without nesting links. */}
                    <span className="absolute inset-0" aria-hidden="true" />
                    <span className="relative">View recommendation</span>
                    <ArrowUpRight
                        className="relative h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                    />
                </a>

                {/* Per-card disclosure only in compact/article contexts; the
                    section-level notice covers grids so it is not repeated
                    under every card (§10). */}
                {disclosure && variant === 'compact' ? (
                    <p className="relative text-[11px] leading-relaxed text-gray-500 dark:text-gray-500">
                        {disclosure}
                    </p>
                ) : null}
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------ *
 * Section wrapper
 * ------------------------------------------------------------------ */

interface AuthorResourcesSectionProps {
    resources: AuthorResourceView[];
    /** Author's first name / display name, for "Recommended by Ephey". */
    authorName?: string | null;
    authorId?: string | null;
    articleId?: string | null;
    placement: ResourcePlacement;
    heading?: string;
    /** Short lead-in shown under the heading. */
    description?: string | null;
    columns?: 2 | 3;
    className?: string;
    /** Optional id so an in-page link can target the section. */
    id?: string;
}

/**
 * "Recommended resources" block.
 *
 * Renders nothing at all when the author has no active resources — no heading,
 * no empty container (§29).
 */
export function AuthorResourcesSection({
    resources,
    authorName,
    authorId,
    articleId,
    placement,
    heading = 'Recommended resources',
    description,
    columns = 3,
    className,
    id,
}: AuthorResourcesSectionProps) {
    const active = resources.filter((resource) => resource.isActive);
    if (!active.length) return null;

    // One notice for the whole section when any link is affiliate (§10).
    const hasAffiliate = active.some((resource) => resource.isAffiliate);
    const firstName = authorName?.trim().split(/\s+/)[0] ?? null;

    return (
        <section id={id} className={cn('scroll-mt-24', className)} aria-labelledby={id ? `${id}-heading` : undefined}>
            <div className="mb-4">
                <h2
                    id={id ? `${id}-heading` : undefined}
                    className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl"
                >
                    {heading}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {description
                        ?? (firstName
                            ? `Tools, guides and products ${firstName} recommends.`
                            : 'Tools, guides and products this author recommends.')}
                </p>
            </div>

            {/* Single column on mobile so cards are full-width (§28). */}
            <div
                className={cn(
                    'grid grid-cols-1 gap-4',
                    columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2',
                )}
            >
                {active.map((resource) => (
                    <AuthorResourceCard
                        key={resource.id}
                        resource={resource}
                        authorId={authorId}
                        articleId={articleId}
                        placement={placement}
                    />
                ))}
            </div>

            {hasAffiliate ? (
                <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                    Some of these are affiliate links. If you buy through them the author may earn a
                    commission at no extra cost to you.
                </p>
            ) : null}
        </section>
    );
}

export default AuthorResourceCard;
