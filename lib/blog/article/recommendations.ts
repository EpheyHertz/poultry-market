/**
 * Article recommendations (§15, §16, §17, §29).
 *
 * Hard rule, enforced in one place: **the current article can never appear in
 * its own recommendations.** Every candidate passes through `dedupe()` which
 * drops the current id (and current slug, defensively) plus repeated ids.
 *
 * Sourcing strategy, in order:
 *   1. search-v2 `RelatedPostsService` — already scores category match, tag
 *      overlap, topic/title similarity, popularity and freshness in SQL.
 *   2. Same-category recent posts (cheap Prisma query).
 *   3. Latest published posts (final graceful fallback, §16).
 *
 * Everything is re-ranked locally with a transparent score so the ordering is
 * explainable and stable:
 *
 *   score = categoryMatch + tagOverlap + titleSimilarity + popularity + freshness
 */

import { prisma } from '@/lib/prisma';
import { RelatedPostsService } from '@/lib/search-v2/RelatedPostsService';
import type { RelatedPostItem } from '@/lib/search-v2/relatedTypes';

/** Statuses that are publicly readable (mirrors lib/search-v2/sql.ts). */
export const PUBLIC_POST_STATUSES = ['PUBLISHED', 'APPROVED'] as const;

/** Shape consumed by the recommendation cards. */
export interface RecommendedArticle {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    category: string;
    publishedAt: string | null;
    /** Best available image (thumbnail preferred for small cards). */
    thumbnail: string | null;
    featuredImage: string | null;
    readingTime: number | null;
    views: number;
    likes: number;
    /** Display name for the byline. */
    authorName: string | null;
    /** author_profiles.username — used to build /blog/{author}/{slug}. */
    authorUsername: string | null;
    authorAvatarUrl: string | null;
    /** Canonical in-app href, always safe to render. */
    href: string;
    /** Why this article was recommended (debugging / analytics only). */
    reasons: string[];
    /** Local relevance score (never rendered to users). */
    score: number;
}

/** The article we are generating recommendations for. */
export interface RecommendationSource {
    id: string;
    slug: string;
    title: string;
    category: string;
    /**
     * Tags for the current article. Accepts either the raw `tag_names` column
     * (space-separated string maintained by DB triggers) or a parsed array.
     */
    tagNames?: string[] | string | null;
    authorId?: string | null;
}

export interface RecommendationSet {
    /** 3–5 compact cards for the sticky sidebar (§17). */
    sidebar: RecommendedArticle[];
    /** 3 large cards below the article (§17). */
    bottom: RecommendedArticle[];
    /**
     * In-content suggestions, rendered between sections for interlinking (§17).
     * Ordered — slot 1 first. Falls back to the best-ranked posts when the pool
     * is too small to give every placement a unique article.
     */
    inArticle: RecommendedArticle[];
    /** Full de-duplicated, ranked pool (useful for tests/debugging). */
    all: RecommendedArticle[];
}

const SIDEBAR_COUNT = 4;
const BOTTOM_COUNT = 3;
const IN_ARTICLE_COUNT = 2;
/** Sidebar + bottom + in-content, with headroom for filtering. */
const POOL_SIZE = SIDEBAR_COUNT + BOTTOM_COUNT + IN_ARTICLE_COUNT;

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'but', 'by', 'can', 'do',
    'does', 'for', 'from', 'guide', 'how', 'in', 'is', 'it', 'its', 'kenya',
    'kenyan', 'of', 'on', 'or', 'poultry', 'that', 'the', 'their', 'this', 'to',
    'tips', 'top', 'was', 'what', 'when', 'why', 'with', 'you', 'your',
]);

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function buildHref(authorUsername: string | null | undefined, slug: string): string {
    // The canonical article URL is /blog/{authorUsername}/{slug}; when an author
    // has no public profile username we fall back to the legacy resolver route.
    return authorUsername
        ? `/blog/${encodeURIComponent(authorUsername)}/${encodeURIComponent(slug)}`
        : `/blog/pastslug?slug=${encodeURIComponent(slug)}`;
}

function tokenize(value: string): Set<string> {
    return new Set(
        value
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
    );
}

/**
 * Normalise tags from either representation into a lowercase unique list.
 * `blog_posts.tag_names` is a whitespace-separated string, while callers may
 * hand us a real array — both are supported.
 */
function normalizeTags(tags?: string[] | string | null): string[] {
    if (!tags) return [];

    const list = Array.isArray(tags) ? tags : tags.split(/[\s,]+/);

    return Array.from(
        new Set(
            list
                .map((tag) => tag?.trim().toLowerCase())
                .filter((tag): tag is string => Boolean(tag)),
        ),
    );
}

/** Freshness decays over ~180 days; anything older scores 0. */
function freshnessScore(publishedAt: string | Date | null | undefined): number {
    if (!publishedAt) return 0;
    const time = publishedAt instanceof Date ? publishedAt.getTime() : Date.parse(publishedAt);
    if (!Number.isFinite(time)) return 0;

    const ageDays = (Date.now() - time) / (1000 * 60 * 60 * 24);
    if (ageDays <= 0) return 1;
    if (ageDays >= 180) return 0;
    return 1 - ageDays / 180;
}

/** Popularity saturates so a single viral post can't dominate forever. */
function popularityScore(views: number, likes: number): number {
    const weighted = Math.max(0, views) + Math.max(0, likes) * 10;
    return Math.min(1, Math.log10(weighted + 1) / 4); // ~10k weighted views ⇒ 1
}

function scoreCandidate(
    source: RecommendationSource,
    sourceTitleTokens: Set<string>,
    sourceTags: string[],
    candidate: {
        title: string;
        category: string;
        publishedAt: string | Date | null;
        views: number;
        likes: number;
        tagNames?: string[] | string | null;
        relationshipScore?: number;
    },
): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // 1. Same category — strongest editorial signal (§16.1).
    if (candidate.category && candidate.category === source.category) {
        score += 3;
        reasons.push('same-category');
    }

    // 2. Tag overlap (§16.2).
    const candidateTags = normalizeTags(candidate.tagNames);
    if (sourceTags.length && candidateTags.length) {
        const overlap = candidateTags.filter((tag) => sourceTags.includes(tag)).length;
        if (overlap > 0) {
            score += Math.min(3, overlap * 1.5);
            reasons.push(`tag-overlap:${overlap}`);
        }
    }

    // 3. Topic similarity from title tokens (§16.3).
    const candidateTokens = tokenize(candidate.title);
    if (sourceTitleTokens.size && candidateTokens.size) {
        let shared = 0;
        candidateTokens.forEach((token) => {
            if (sourceTitleTokens.has(token)) shared += 1;
        });
        if (shared > 0) {
            const similarity = shared / Math.min(sourceTitleTokens.size, candidateTokens.size);
            score += similarity * 2;
            reasons.push(`topic-similarity:${shared}`);
        }
    }

    // 4. Popularity (§16.5).
    const popularity = popularityScore(candidate.views, candidate.likes);
    if (popularity > 0) {
        score += popularity * 1.5;
        if (popularity > 0.6) reasons.push('popular');
    }

    // 5. Freshness (§16.4).
    const freshness = freshnessScore(candidate.publishedAt);
    if (freshness > 0) {
        score += freshness * 1.5;
        if (freshness > 0.7) reasons.push('recent');
    }

    // 6. Trust the SQL engine's own relationship score as a tiebreaker.
    if (typeof candidate.relationshipScore === 'number' && candidate.relationshipScore > 0) {
        score += Math.min(2, candidate.relationshipScore / 50);
        reasons.push('engine-match');
    }

    return { score, reasons };
}

/**
 * §29 — remove the current article and any repeated ids/slugs.
 * This is the single choke point every candidate must pass through.
 */
function dedupe(
    candidates: RecommendedArticle[],
    source: RecommendationSource,
    seenIds: Set<string>,
    seenSlugs: Set<string>,
): RecommendedArticle[] {
    const output: RecommendedArticle[] = [];

    for (const candidate of candidates) {
        if (!candidate.id || !candidate.slug || !candidate.title) continue;
        // The current article must NEVER appear in its own recommendations.
        if (candidate.id === source.id) continue;
        if (candidate.slug === source.slug) continue;
        if (seenIds.has(candidate.id)) continue;
        if (seenSlugs.has(candidate.slug)) continue;

        seenIds.add(candidate.id);
        seenSlugs.add(candidate.slug);
        output.push(candidate);
    }

    return output;
}

/* ------------------------------------------------------------------ *
 * Candidate loaders
 * ------------------------------------------------------------------ */

function mapEngineItem(item: RelatedPostItem): RecommendedArticle {
    return {
        id: item.id,
        slug: item.slug,
        title: item.title,
        excerpt: item.excerpt,
        category: item.category,
        publishedAt: item.publishedAt,
        thumbnail: item.thumbnail,
        featuredImage: item.featuredImage,
        readingTime: item.readingTime,
        views: item.views ?? 0,
        likes: item.likes ?? 0,
        authorName: item.author,
        authorUsername: item.authorUsername,
        authorAvatarUrl: null,
        href: buildHref(item.authorUsername, item.slug),
        reasons: item.reasons ?? [],
        score: 0,
    };
}

type PrismaCandidate = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    category: string;
    publishedAt: Date | null;
    createdAt: Date;
    thumbnail: string | null;
    featuredImage: string | null;
    readingTime: number | null;
    estimatedReadTime: number | null;
    viewCount: number;
    likes: number;
    tagNames: string | null;
    authorName: string | null;
    author: { name: string | null; avatar: string | null } | null;
    authorProfile: {
        username: string | null;
        displayName: string | null;
        avatarUrl: string | null;
    } | null;
};

const PRISMA_CANDIDATE_SELECT = {
    id: true,
    slug: true,
    title: true,
    excerpt: true,
    category: true,
    publishedAt: true,
    createdAt: true,
    thumbnail: true,
    featuredImage: true,
    readingTime: true,
    estimatedReadTime: true,
    viewCount: true,
    likes: true,
    tagNames: true,
    authorName: true,
    author: { select: { name: true, avatar: true } },
    authorProfile: { select: { username: true, displayName: true, avatarUrl: true } },
} as const;

function mapPrismaCandidate(post: PrismaCandidate): RecommendedArticle {
    const username = post.authorProfile?.username ?? null;
    const published = post.publishedAt ?? post.createdAt;

    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        publishedAt: published ? published.toISOString() : null,
        thumbnail: post.thumbnail,
        featuredImage: post.featuredImage,
        readingTime: post.readingTime ?? post.estimatedReadTime ?? null,
        views: post.viewCount ?? 0,
        likes: post.likes ?? 0,
        authorName:
            post.authorProfile?.displayName ?? post.author?.name ?? post.authorName ?? null,
        authorUsername: username,
        authorAvatarUrl: post.authorProfile?.avatarUrl ?? post.author?.avatar ?? null,
        href: buildHref(username, post.slug),
        reasons: [],
        score: 0,
    };
}

/** Tags for the engine-sourced candidates (the SQL engine doesn't return them). */
async function loadTagsForIds(ids: string[]): Promise<Map<string, string[]>> {
    if (!ids.length) return new Map();

    try {
        const rows = await prisma.blogPost.findMany({
            where: { id: { in: ids } },
            select: { id: true, tagNames: true },
        });
        return new Map(rows.map((row) => [row.id, normalizeTags(row.tagNames)]));
    } catch (error) {
        console.error('[recommendations] failed to load candidate tags:', error);
        return new Map();
    }
}

async function loadFromEngine(slug: string, limit: number): Promise<RecommendedArticle[]> {
    try {
        const envelope = await RelatedPostsService.findRelated(slug, limit);
        return envelope.relatedPosts.map(mapEngineItem);
    } catch (error) {
        // A missing/unindexed post or a search outage must not break the page.
        console.error('[recommendations] related engine unavailable:', error);
        return [];
    }
}

async function loadFromPrisma(
    excludeIds: string[],
    options: { category?: string; take: number },
): Promise<RecommendedArticle[]> {
    try {
        const posts = await prisma.blogPost.findMany({
            where: {
                status: { in: [...PUBLIC_POST_STATUSES] },
                id: { notIn: excludeIds.length ? excludeIds : undefined },
                ...(options.category ? { category: options.category as never } : {}),
            },
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            take: options.take,
            select: PRISMA_CANDIDATE_SELECT,
        });

        return (posts as unknown as PrismaCandidate[]).map(mapPrismaCandidate);
    } catch (error) {
        console.error('[recommendations] fallback query failed:', error);
        return [];
    }
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Resolve recommendations for an article.
 *
 * Never throws and never returns the current article. When nothing related
 * exists the sets simply come back shorter (or empty), which the UI handles
 * by hiding the block (§16 "graceful fallback", test case "empty
 * recommendations").
 */
export async function getRecommendations(
    source: RecommendationSource,
    options: { sidebarCount?: number; bottomCount?: number; inArticleCount?: number } = {},
): Promise<RecommendationSet> {
    const sidebarCount = Math.max(0, options.sidebarCount ?? SIDEBAR_COUNT);
    const bottomCount = Math.max(0, options.bottomCount ?? BOTTOM_COUNT);
    const inArticleCount = Math.max(0, options.inArticleCount ?? IN_ARTICLE_COUNT);
    const target = sidebarCount + bottomCount + inArticleCount || POOL_SIZE;

    const seenIds = new Set<string>([source.id]);
    const seenSlugs = new Set<string>([source.slug]);
    const pool: RecommendedArticle[] = [];

    // 1. Intelligent matches from the search-v2 engine.
    const engineCandidates = await loadFromEngine(source.slug, Math.min(12, target + 4));
    pool.push(...dedupe(engineCandidates, source, seenIds, seenSlugs));

    // 2. Top up with same-category posts.
    if (pool.length < target) {
        const sameCategory = await loadFromPrisma(Array.from(seenIds), {
            category: source.category,
            take: (target - pool.length) + 4,
        });
        pool.push(...dedupe(sameCategory, source, seenIds, seenSlugs));
    }

    // 3. Final fallback: latest posts regardless of category (§16).
    if (pool.length < target) {
        const latest = await loadFromPrisma(Array.from(seenIds), {
            take: (target - pool.length) + 4,
        });
        pool.push(...dedupe(latest, source, seenIds, seenSlugs));
    }

    if (!pool.length) {
        return { sidebar: [], bottom: [], inArticle: [], all: [] };
    }

    // Rank everything with the same transparent formula.
    const sourceTitleTokens = tokenize(source.title);
    const sourceTags = normalizeTags(source.tagNames);
    const tagsById = await loadTagsForIds(
        pool.filter((item) => !item.reasons.length).map((item) => item.id),
    );

    const ranked = pool
        .map((candidate) => {
            const { score, reasons } = scoreCandidate(source, sourceTitleTokens, sourceTags, {
                title: candidate.title,
                category: candidate.category,
                publishedAt: candidate.publishedAt,
                views: candidate.views,
                likes: candidate.likes,
                tagNames: tagsById.get(candidate.id) ?? null,
                relationshipScore: candidate.reasons.length ? 25 : 0,
            });

            return {
                ...candidate,
                score,
                reasons: Array.from(new Set([...candidate.reasons, ...reasons])),
            };
        })
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            // Deterministic tiebreak: newest first, then id for stability.
            const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
            const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
            if (bTime !== aTime) return bTime - aTime;
            return a.id.localeCompare(b.id);
        });

    // Slice into placements. Sidebar gets the strongest matches; the bottom
    // rail shows the next best so a reader never sees the same card twice on
    // one page.
    const sidebar = ranked.slice(0, sidebarCount);
    const bottomStart = ranked.length > sidebarCount + bottomCount ? sidebarCount : 0;
    const bottom = ranked.slice(bottomStart, bottomStart + bottomCount);

    // In-content links prefer articles not already shown elsewhere on the page,
    // then fall back to the strongest matches so interlinking still happens on
    // sites with only a handful of posts.
    const usedElsewhere = new Set([...sidebar, ...bottom].map((item) => item.id));
    const unused = ranked.filter((item) => !usedElsewhere.has(item.id));
    const inArticle = [...unused, ...ranked.filter((item) => !unused.includes(item))].slice(
        0,
        inArticleCount,
    );

    return { sidebar, bottom, inArticle, all: ranked };
}
