/**
 * SearchService — Blog Search & Hybrid Semantic Search
 *
 * Clean-architecture service layer for blog search operations.
 * All search logic lives here; route handlers only orchestrate.
 *
 * The "semantic" search uses a hybrid approach:
 *   1. PostgreSQL Full-Text Search (tsvector/tsquery) — stemming + ranking
 *   2. Prisma keyword contains search — exact substring matching
 *   3. Reciprocal Rank Fusion (RRF) — merges both result sets
 *
 * No external embedding APIs required. Runs entirely in Postgres.
 */

import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/seo';
import type {
  BlogSearchResult,
  SearchBlogsParams,
  SemanticSearchParams,
  SemanticSearchResult,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

/** RRF constant — standard value from the original paper. */
const RRF_K = 60;

/** Number of candidates each sub-search retrieves before fusion. */
const FTS_CANDIDATE_LIMIT = 30;
const KEYWORD_CANDIDATE_LIMIT = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampLimit(limit?: number): number {
  if (limit === undefined || limit === null) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
}

/** Build the public-facing URL for a blog post. */
function buildPostUrl(
  slug: string,
  authorUsername: string | null,
  authorName: string | null,
): string {
  const authorPath =
    authorUsername ||
    (authorName ? authorName.replace(/\s+/g, '-').toLowerCase() : 'author');
  return `${SITE_URL}/blog/${authorPath}/${slug}`;
}

/**
 * Sanitise a user query into a safe tsquery string.
 * Strips special characters, joins terms with OR for broad matching.
 * Uses prefix matching (:*) on the last term for partial-word support.
 */
function buildTsQuery(query: string): string {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (terms.length === 0) return '';

  // Prefix-match the last term, exact-match the rest, joined with OR
  const parts = terms.map((t, i) =>
    i === terms.length - 1 ? `${t}:*` : t,
  );

  return parts.join(' | ');
}

// ---------------------------------------------------------------------------
// Prisma select shapes
// ---------------------------------------------------------------------------

const searchSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  category: true,
  publishedAt: true,
  authorProfile: { select: { username: true } },
  author: { select: { name: true } },
  tags: { select: { tag: { select: { name: true } } } },
} as const;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SearchService {
  /**
   * Keyword search across published blogs.
   *
   * Searches title, excerpt, tags, and content using case-insensitive
   * `contains`. Category is matched when the query matches a category name.
   *
   * Never returns draft / unpublished articles.
   */
  async searchBlogs(params: SearchBlogsParams): Promise<BlogSearchResult[]> {
    const limit = clampLimit(params.limit);
    const query = params.query.trim();

    // Build OR conditions for text fields
    const orConditions: Record<string, unknown>[] = [
      { title: { contains: query, mode: 'insensitive' } },
      { excerpt: { contains: query, mode: 'insensitive' } },
      { content: { contains: query, mode: 'insensitive' } },
      {
        tags: {
          some: {
            tag: { name: { contains: query, mode: 'insensitive' } },
          },
        },
      },
    ];

    // If the query matches a known category enum value, include it
    const categoryMatch = this.matchCategory(query);
    if (categoryMatch) {
      orConditions.push({ category: categoryMatch });
    }

    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        OR: orConditions,
      },
      select: searchSelect,
      take: limit,
      orderBy: { publishedAt: 'desc' },
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags.map((t) => t.tag.name),
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      url: buildPostUrl(
        post.slug,
        post.authorProfile?.username ?? null,
        post.author?.name ?? null,
      ),
    }));
  }

  /**
   * Hybrid semantic search for AI agents.
   *
   * Combines two signals:
   *   1. PostgreSQL Full-Text Search — stemming, weighted fields, ts_rank_cd
   *   2. Prisma keyword contains — catches exact substrings FTS may miss
   *
   * Results are merged with Reciprocal Rank Fusion (RRF) for a final
   * ranking that benefits from both approaches.
   */
  async semanticSearch(
    params: SemanticSearchParams,
  ): Promise<SemanticSearchResult[]> {
    const limit = clampLimit(params.limit);
    const query = params.query.trim();

    if (!query) return [];

    // Run both searches in parallel
    const [ftsResults, keywordResults] = await Promise.all([
      this.fullTextSearch(query, FTS_CANDIDATE_LIMIT),
      this.keywordContainsSearch(query, KEYWORD_CANDIDATE_LIMIT),
    ]);

    // Merge with Reciprocal Rank Fusion
    const fused = this.reciprocalRankFusion(ftsResults, keywordResults);

    return fused.slice(0, limit);
  }

  // -------------------------------------------------------------------------
  // PostgreSQL Full-Text Search
  // -------------------------------------------------------------------------

  /**
   * Full-text search using Postgres tsvector/tsquery.
   *
   * Builds a weighted tsvector from title (A), tags (B), excerpt (C),
   * and content (D). Uses ts_rank_cd for relevance scoring.
   * Falls back to an empty array on error (e.g., if the DB doesn't
   * support the function).
   */
  private async fullTextSearch(
    query: string,
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    const tsQuery = buildTsQuery(query);
    if (!tsQuery) return [];

    try {
      const results = await prisma.$queryRawUnsafe<
        {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          rank: number;
          author_username: string | null;
          author_name: string | null;
        }[]
      >(
        `SELECT
           bp.id,
           bp.title,
           bp.slug,
           bp.excerpt,
           ts_rank_cd(
             setweight(to_tsvector('english', coalesce(bp.title, '')), 'A') ||
             setweight(to_tsvector('english', coalesce(
               (SELECT string_agg(bt.name, ' ')
                FROM blog_post_tags bpt
                JOIN blog_tags bt ON bt.id = bpt."tagId"
                WHERE bpt."postId" = bp.id), ''
             )), 'B') ||
             setweight(to_tsvector('english', coalesce(bp.excerpt, '')), 'C') ||
             setweight(to_tsvector('english', coalesce(bp.content, '')), 'D'),
             to_tsquery('english', $1)
           ) AS rank,
           ap.username AS author_username,
           u.name AS author_name
         FROM blog_posts bp
         LEFT JOIN author_profiles ap ON ap.id = bp."authorProfileId"
         LEFT JOIN users u ON u.id = bp."authorId"
         WHERE bp.status = 'PUBLISHED'
           AND (
             setweight(to_tsvector('english', coalesce(bp.title, '')), 'A') ||
             setweight(to_tsvector('english', coalesce(
               (SELECT string_agg(bt.name, ' ')
                FROM blog_post_tags bpt
                JOIN blog_tags bt ON bt.id = bpt."tagId"
                WHERE bpt."postId" = bp.id), ''
             )), 'B') ||
             setweight(to_tsvector('english', coalesce(bp.excerpt, '')), 'C') ||
             setweight(to_tsvector('english', coalesce(bp.content, '')), 'D')
           ) @@ to_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        tsQuery,
        limit,
      );

      return results.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt,
        url: buildPostUrl(r.slug, r.author_username, r.author_name),
        score: Math.round(Number(r.rank) * 1000) / 1000,
      }));
    } catch (err) {
      console.error('[SearchService] FTS query failed, falling back:', err);
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Keyword contains search (broadened)
  // -------------------------------------------------------------------------

  /**
   * Simple keyword search using Prisma `contains` across individual terms.
   * This catches exact substrings that FTS stemming might alter.
   * Each query term is searched independently (OR logic).
   */
  private async keywordContainsSearch(
    query: string,
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    const terms = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2); // skip very short words

    if (terms.length === 0) return [];

    // Build OR conditions: each term searched across title, excerpt, content, tags
    const orConditions: Record<string, unknown>[] = [];

    for (const term of terms) {
      orConditions.push(
        { title: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        {
          tags: {
            some: {
              tag: { name: { contains: term, mode: 'insensitive' } },
            },
          },
        },
      );
    }

    // Also match category
    const categoryMatch = this.matchCategory(query);
    if (categoryMatch) {
      orConditions.push({ category: categoryMatch });
    }

    try {
      const posts = await prisma.blogPost.findMany({
        where: {
          status: 'PUBLISHED',
          OR: orConditions,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          authorProfile: { select: { username: true } },
          author: { select: { name: true } },
        },
        take: limit,
        orderBy: { publishedAt: 'desc' },
      });

      return posts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        url: buildPostUrl(
          post.slug,
          post.authorProfile?.username ?? null,
          post.author?.name ?? null,
        ),
        score: 0, // score will be replaced by RRF
      }));
    } catch (err) {
      console.error('[SearchService] Keyword search failed:', err);
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Reciprocal Rank Fusion
  // -------------------------------------------------------------------------

  /**
   * Merge two ranked result lists using Reciprocal Rank Fusion (RRF).
   *
   * RRF score for a document = Σ 1 / (k + rank_i) across all lists
   * where k = 60 (standard constant from the RRF paper).
   *
   * This produces a combined ranking that benefits from both FTS
   * (stemming, relevance) and keyword (exact match) signals.
   */
  private reciprocalRankFusion(
    ftsResults: SemanticSearchResult[],
    keywordResults: SemanticSearchResult[],
  ): SemanticSearchResult[] {
    const scoreMap = new Map<
      string,
      { result: SemanticSearchResult; rrfScore: number }
    >();

    // Score from FTS results
    ftsResults.forEach((result, index) => {
      const rrfScore = 1 / (RRF_K + index + 1);
      const existing = scoreMap.get(result.id);
      if (existing) {
        existing.rrfScore += rrfScore;
      } else {
        scoreMap.set(result.id, { result, rrfScore });
      }
    });

    // Score from keyword results
    keywordResults.forEach((result, index) => {
      const rrfScore = 1 / (RRF_K + index + 1);
      const existing = scoreMap.get(result.id);
      if (existing) {
        existing.rrfScore += rrfScore;
      } else {
        scoreMap.set(result.id, { result, rrfScore });
      }
    });

    // Sort by RRF score descending, normalise to 0–1
    const sorted = Array.from(scoreMap.values()).sort(
      (a, b) => b.rrfScore - a.rrfScore,
    );

    const maxScore = sorted.length > 0 ? sorted[0].rrfScore : 1;

    return sorted.map(({ result, rrfScore }) => ({
      ...result,
      score: Math.round((rrfScore / maxScore) * 1000) / 1000,
    }));
  }

  // -------------------------------------------------------------------------
  // Category matching
  // -------------------------------------------------------------------------

  /**
   * Attempt to match a raw query string to a BlogPostCategory enum value.
   * Returns the enum string or null.
   */
  private matchCategory(query: string): string | null {
    const categories = [
      'FARMING_TIPS',
      'POULTRY_HEALTH',
      'FEED_NUTRITION',
      'EQUIPMENT_GUIDES',
      'MARKET_TRENDS',
      'SUCCESS_STORIES',
      'INDUSTRY_NEWS',
      'SEASONAL_ADVICE',
      'BEGINNER_GUIDES',
      'ADVANCED_TECHNIQUES',
    ];

    const normalised = query.toUpperCase().replace(/[\s-]+/g, '_');
    const found = categories.find(
      (c) => c === normalised || c.replace(/_/g, ' ').includes(query.toLowerCase()),
    );
    return found ?? null;
  }
}

/** Singleton instance for reuse across route handlers. */
export const searchService = new SearchService();
