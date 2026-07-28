/**
 * SearchService — Blog Search & Hybrid Semantic Search
 *
 * Clean-architecture service layer for blog search operations.
 * All search logic lives here; route handlers only orchestrate.
 *
 * The "semantic" search uses a three-tier hybrid approach:
 *   1. PostgreSQL Full-Text Search (tsvector/tsquery), tried AND-first for
 *      precision and falling back to OR for recall.
 *   2. Prisma keyword `contains` search — exact substring matching that FTS
 *      stemming can sometimes miss.
 *   3. Trigram similarity fallback (pg_trgm) — only engaged when tiers 1 and
 *      2 both come back empty, so typos / unusual phrasing still surface
 *      something instead of a hard zero.
 * All three are merged with Reciprocal Rank Fusion (RRF).
 *
 * No external embedding APIs required. Runs entirely in Postgres.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️  IMPORTANT — VERIFY YOUR RAW SQL TABLE NAMES BEFORE RELYING ON THIS
 * ─────────────────────────────────────────────────────────────────────────
 * FTS_SQL and the trigram query below assume your Postgres tables are:
 *   blog_posts, blog_post_tags, blog_tags, author_profiles, users
 * with columns "authorProfileId", "authorId", "tagId", "postId".
 *
 * These are only correct if your schema.prisma sets @@map(...) to these
 * snake_case names. If it doesn't, Prisma's default table name is the
 * PascalCase model name (e.g. "BlogPost", not blog_posts), and every raw
 * query below will throw `relation "blog_posts" does not exist`.
 *
 * That error used to be swallowed silently and returned as an empty
 * array — which is very likely why you were seeing 0 results on every
 * query. It is no longer swallowed silently: it's logged with the real
 * Postgres error code, and you can also call `diagnoseSearchHealth()`
 * (or run scripts/diagnose-search.ts) to confirm your actual table names
 * and whether you have any PUBLISHED posts at all.
 * ─────────────────────────────────────────────────────────────────────────
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
const TRIGRAM_CANDIDATE_LIMIT = 15;

/** Minimum trigram similarity (0–1) to count as a fallback match. */
const TRIGRAM_SIMILARITY_THRESHOLD = 0.15;

/** Terms shorter than this (after cleaning) are dropped as noise. */
const MIN_TERM_LENGTH = 2;

/**
 * Common English filler words that add OR-noise to tsquery/contains
 * matching without adding search signal. Deliberately conservative —
 * only words that are never meaningful as standalone search terms.
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from',
  'has', 'have', 'how', 'if', 'in', 'into', 'is', 'it', 'its', 'of', 'on',
  'or', 'our', 'she', 'that', 'the', 'their', 'then', 'there', 'these',
  'they', 'this', 'to', 'was', 'we', 'what', 'when', 'where', 'which',
  'who', 'why', 'will', 'with', 'you', 'your',
]);

// ---------------------------------------------------------------------------
// Shared helpers
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
 * Clean a raw query into significant search tokens: lowercase, strip
 * punctuation, drop stopwords and very short fragments. Shared by FTS,
 * keyword search, and category matching so all three agree on what
 * counts as a "real" term.
 */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= MIN_TERM_LENGTH && !STOPWORDS.has(t));
}

/**
 * Build a tsquery string from pre-tokenized terms.
 * Every term is prefix-matched (:*) — more forgiving of plurals/typos
 * than matching only the last term, which is what comprehensive search
 * UX (typeahead-style) generally expects.
 */
function buildTsQueryFromTerms(terms: string[], mode: 'and' | 'or'): string {
  if (terms.length === 0) return '';
  const sep = mode === 'and' ? ' & ' : ' | ';
  return terms.map((t) => `${t}:*`).join(sep);
}

/** Safely pull a message/error-code out of an unknown thrown value. */
function describeError(err: unknown): { message: string; code?: string } {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; code?: string };
    return { message: e.message ?? String(err), code: e.code };
  }
  return { message: String(err) };
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
// Raw SQL (shared between AND / OR full-text queries)
// ---------------------------------------------------------------------------

interface RawFtsRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  rank: number;
  author_username: string | null;
  author_name: string | null;
}

const FTS_SQL = `
  SELECT
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
  LIMIT $2
`;

function mapFtsRow(r: RawFtsRow): SemanticSearchResult {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    url: buildPostUrl(r.slug, r.author_username, r.author_name),
    score: Math.round(Number(r.rank) * 1000) / 1000,
  };
}

// ---------------------------------------------------------------------------
// Diagnostics types
// ---------------------------------------------------------------------------

export interface SearchProbeResult {
  ok: boolean;
  error?: string;
  errorCode?: string;
}

export interface SearchDiagnosticsReport {
  timestamp: string;
  totalPosts: number;
  postsByStatus: Record<string, number>;
  samplePublishedTitles: string[];
  /** Does the raw `blog_posts` table used by fullTextSearch() actually exist? */
  rawTableProbe: SearchProbeResult;
  /** Does the ordinary Prisma client path (used by keyword search) work? */
  prismaClientProbe: SearchProbeResult;
  /** Is the pg_trgm extension installed (needed for the fallback tier)? */
  trigramExtensionProbe: SearchProbeResult;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SearchService {
  /**
   * Keyword search across published blogs (simple, UI-facing).
   *
   * Searches title, excerpt, tags, and content using case-insensitive
   * `contains`. Category is matched when the query overlaps a category
   * name's own words. Never returns draft / unpublished articles.
   */
  async searchBlogs(params: SearchBlogsParams): Promise<BlogSearchResult[]> {
    const limit = clampLimit(params.limit);
    const query = params.query.trim();
    const terms = tokenize(query);

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

    const categoryMatch = this.matchCategory(terms, query);
    if (categoryMatch) {
      orConditions.push({ category: categoryMatch });
    }

    const posts = await prisma.blogPost.findMany({
      where: { status: 'PUBLISHED', OR: orConditions },
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
   * Tier 1: Postgres FTS, AND-first (precision) then OR fallback (recall).
   * Tier 2: Prisma keyword `contains` (catches exact substrings FTS misses).
   * Tier 3: Trigram similarity — engaged only if tiers 1 & 2 are both empty.
   *
   * Results are merged with Reciprocal Rank Fusion (RRF).
   */
  async semanticSearch(
    params: SemanticSearchParams,
  ): Promise<SemanticSearchResult[]> {
    const limit = clampLimit(params.limit);
    const query = params.query.trim();
    if (!query) return [];

    const terms = tokenize(query);
    if (terms.length === 0) {
      console.warn(
        `[SearchService] query "${query}" had no indexable terms after ` +
        `stopword/length filtering — only category matching can apply.`,
      );
    }

    const [ftsResults, keywordResults] = await Promise.all([
      this.fullTextSearch(terms, FTS_CANDIDATE_LIMIT),
      this.keywordContainsSearch(query, terms, KEYWORD_CANDIDATE_LIMIT),
    ]);

    console.info(
      `[SearchService] query="${query}" terms=[${terms.join(', ')}] ` +
      `fts=${ftsResults.length} keyword=${keywordResults.length}`,
    );

    let resultLists: SemanticSearchResult[][] = [ftsResults, keywordResults];

    if (ftsResults.length === 0 && keywordResults.length === 0) {
      const trigramResults = await this.trigramFallbackSearch(
        query,
        TRIGRAM_CANDIDATE_LIMIT,
      );
      console.info(
        `[SearchService] fts + keyword both empty for "${query}", ` +
        `trigram fallback returned ${trigramResults.length}`,
      );
      resultLists = [trigramResults];
    }

    const fused = this.reciprocalRankFusion(resultLists);
    return fused.slice(0, limit);
  }

  // -------------------------------------------------------------------------
  // Tier 1: PostgreSQL Full-Text Search
  // -------------------------------------------------------------------------

  /**
   * AND-first, OR-fallback full-text search using Postgres tsvector/tsquery.
   * Both variants run in parallel; if AND yields matches they're preferred
   * (higher precision), otherwise OR results are used (higher recall).
   * Never throws — logs a detailed, non-silent diagnostic on failure.
   */
  private async fullTextSearch(
    terms: string[],
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    if (terms.length === 0) return [];

    const andQuery = buildTsQueryFromTerms(terms, 'and');
    const orQuery = buildTsQueryFromTerms(terms, 'or');

    const run = (tsQuery: string) =>
      prisma.$queryRawUnsafe<RawFtsRow[]>(FTS_SQL, tsQuery, limit);

    const [andSettled, orSettled] = await Promise.allSettled([
      run(andQuery),
      run(orQuery),
    ]);

    if (andSettled.status === 'rejected') {
      const { message, code } = describeError(andSettled.reason);
      console.error(
        `[SearchService] FTS (AND) query failed (code=${code ?? 'n/a'}): ${message}. ` +
        `This usually means the raw-SQL table/column names in FTS_SQL don't match ` +
        `your actual Postgres schema. Call diagnoseSearchHealth() to confirm.`,
      );
    }
    if (orSettled.status === 'rejected') {
      const { message, code } = describeError(orSettled.reason);
      console.error(
        `[SearchService] FTS (OR) query failed (code=${code ?? 'n/a'}): ${message}`,
      );
    }

    const andResults =
      andSettled.status === 'fulfilled' ? andSettled.value.map(mapFtsRow) : [];
    if (andResults.length > 0) return andResults;

    return orSettled.status === 'fulfilled'
      ? orSettled.value.map(mapFtsRow)
      : [];
  }

  // -------------------------------------------------------------------------
  // Tier 2: Keyword contains search (broadened)
  // -------------------------------------------------------------------------

  /**
   * Simple keyword search using Prisma `contains` across individual terms.
   * Catches exact substrings that FTS stemming might alter.
   * Never throws — logs a detailed diagnostic on failure instead of
   * silently returning an empty array.
   */
  private async keywordContainsSearch(
    rawQuery: string,
    terms: string[],
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    if (terms.length === 0) return [];

    const orConditions: Record<string, unknown>[] = [];
    for (const term of terms) {
      orConditions.push(
        { title: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        {
          tags: {
            some: { tag: { name: { contains: term, mode: 'insensitive' } } },
          },
        },
      );
    }

    const categoryMatch = this.matchCategory(terms, rawQuery);
    if (categoryMatch) {
      orConditions.push({ category: categoryMatch });
    }

    try {
      const posts = await prisma.blogPost.findMany({
        where: { status: 'PUBLISHED', OR: orConditions },
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
        score: 0, // replaced by RRF
      }));
    } catch (err) {
      const { message, code } = describeError(err);
      console.error(
        `[SearchService] Keyword search failed (code=${code ?? 'n/a'}): ${message}`,
      );
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Tier 3: Trigram fuzzy fallback (only used if tiers 1 & 2 return nothing)
  // -------------------------------------------------------------------------

  /**
   * Fuzzy fallback using pg_trgm similarity(). Only engaged when both FTS
   * and keyword search come back empty, so it never displaces higher-
   * confidence matches — it exists purely so a typo or unusual phrasing
   * doesn't produce a hard zero.
   *
   * Requires the extension once per database:
   *   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   * If it isn't installed, this fails closed (returns []) and logs a
   * clear, actionable message rather than throwing.
   */
  private async trigramFallbackSearch(
    query: string,
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    if (!query) return [];

    try {
      const results = await prisma.$queryRawUnsafe<
        (RawFtsRow & { sim: number })[]
      >(
        `SELECT
           bp.id, bp.title, bp.slug, bp.excerpt,
           GREATEST(
             similarity(bp.title, $1),
             similarity(coalesce(bp.excerpt, ''), $1)
           ) AS sim,
           ap.username AS author_username,
           u.name AS author_name
         FROM blog_posts bp
         LEFT JOIN author_profiles ap ON ap.id = bp."authorProfileId"
         LEFT JOIN users u ON u.id = bp."authorId"
         WHERE bp.status = 'PUBLISHED'
           AND (
             similarity(bp.title, $1) > $2
             OR similarity(coalesce(bp.excerpt, ''), $1) > $2
           )
         ORDER BY sim DESC
         LIMIT $3`,
        query,
        TRIGRAM_SIMILARITY_THRESHOLD,
        limit,
      );

      return results.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt,
        url: buildPostUrl(r.slug, r.author_username, r.author_name),
        score: Math.round(Number(r.sim) * 1000) / 1000,
      }));
    } catch (err) {
      const { message, code } = describeError(err);
      console.error(
        `[SearchService] Trigram fallback unavailable (code=${code ?? 'n/a'}): ` +
        `${message}. If this is the first time you're seeing this, run ` +
        `"CREATE EXTENSION IF NOT EXISTS pg_trgm;" on your database.`,
      );
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Reciprocal Rank Fusion
  // -------------------------------------------------------------------------

  /**
   * Merge any number of ranked result lists using Reciprocal Rank Fusion.
   * RRF score for a document = Σ 1 / (k + rank_i) across all lists that
   * contain it, k = 60 (standard constant from the RRF paper).
   */
  private reciprocalRankFusion(
    resultLists: SemanticSearchResult[][],
  ): SemanticSearchResult[] {
    const scoreMap = new Map<
      string,
      { result: SemanticSearchResult; rrfScore: number }
    >();

    for (const list of resultLists) {
      list.forEach((result, index) => {
        const rrfScore = 1 / (RRF_K + index + 1);
        const existing = scoreMap.get(result.id);
        if (existing) {
          existing.rrfScore += rrfScore;
        } else {
          scoreMap.set(result.id, { result, rrfScore });
        }
      });
    }

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
   * Match query terms to a BlogPostCategory enum value by token overlap
   * (e.g. terms containing "market" match MARKET_TRENDS), falling back to
   * an exact normalised match. More forgiving than substring containment,
   * which rarely fires for real multi-word queries.
   */
  private matchCategory(terms: string[], rawQuery: string): string | null {
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

    const normalizedFull = rawQuery.toUpperCase().replace(/[\s-]+/g, '_');
    const exact = categories.find((c) => c === normalizedFull);
    if (exact) return exact;

    const termSet = new Set(terms);
    let best: { category: string; overlap: number } | null = null;
    for (const category of categories) {
      const words = category.toLowerCase().split('_');
      const overlap = words.filter((w) => termSet.has(w)).length;
      if (overlap > 0 && (!best || overlap > best.overlap)) {
        best = { category, overlap };
      }
    }
    return best?.category ?? null;
  }

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  /**
   * One-call health check for "why am I getting zero results". Reports:
   *  - how many posts exist and their status breakdown (catches "no
   *    PUBLISHED posts" as a data issue rather than a code bug)
   *  - whether the raw `blog_posts` table used by fullTextSearch() exists
   *  - whether the ordinary Prisma client path works
   *  - whether pg_trgm is installed for the fallback tier
   *
   * Safe to wire into an admin/debug API route, or run via
   * scripts/diagnose-search.ts from the command line.
   */
  async diagnoseSearchHealth(): Promise<SearchDiagnosticsReport> {
    const [totalPosts, byStatusRaw, samples] = await Promise.all([
      prisma.blogPost.count(),
      prisma.blogPost.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.blogPost.findMany({
        where: { status: 'PUBLISHED' },
        select: { title: true },
        take: 5,
      }),
    ]);

    const postsByStatus: Record<string, number> = {};
    for (const row of byStatusRaw as unknown as {
      status: string;
      _count: { _all: number };
    }[]) {
      postsByStatus[row.status] = row._count._all;
    }

    const [rawTableProbe, prismaClientProbe, trigramExtensionProbe] =
      await Promise.all([
        this.probe(() => prisma.$queryRawUnsafe(`SELECT 1 FROM blog_posts LIMIT 1`)),
        this.probe(() => prisma.blogPost.findFirst()),
        this.probe(() =>
          prisma.$queryRawUnsafe(`SELECT similarity('a', 'a')`),
        ),
      ]);

    return {
      timestamp: new Date().toISOString(),
      totalPosts,
      postsByStatus,
      samplePublishedTitles: samples.map((s) => s.title),
      rawTableProbe,
      prismaClientProbe,
      trigramExtensionProbe,
    };
  }

  private async probe(fn: () => Promise<unknown>): Promise<SearchProbeResult> {
    try {
      await fn();
      return { ok: true };
    } catch (err) {
      const { message, code } = describeError(err);
      return { ok: false, error: message, errorCode: code };
    }
  }
}

/** Singleton instance for reuse across route handlers. */
export const searchService = new SearchService();