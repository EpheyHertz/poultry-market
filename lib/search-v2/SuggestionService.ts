/**
 * SuggestionService — typeahead / autocomplete (§6, §8 /suggest, §12.8).
 *
 * Builds a merged suggestion list from five sources, in display priority:
 *   1. title     — published post titles matching the prefix / fuzzy
 *   2. category  — category labels (live; only 10 enum values — cheap)
 *   3. tag       — tag names (matview first, live aggregate fallback)
 *   4. author    — author display names matching the prefix
 *   5. popular / trending / recent — historical search terms (matview
 *      first, live aggregates fallback; matviews are refreshed by cron —
 *      Phase 8C — so fallbacks keep the feature working meanwhile)
 *
 * Parameters: $1 = folded query prefix, $2 = trigram similarity threshold,
 * $3 = session id (only bound when a session-scoped "recent" branch is
 * included). All SQL is parameterized; results are cached in memory for
 * `ttls.autocompleteSec` (default 60s), keyed by normalized query + session.
 */

import { prisma } from '@/lib/prisma';
import { ConfigService } from './ConfigService';
import { QUERY_MAX_LENGTH } from './FilterService';
import { fold, PUBLIC_STATUSES } from './sql';
import { SearchValidationError, SearchSuggestion } from './types';

const DEFAULT_SUGGESTION_LIMIT = 8;
const MAX_SUGGESTION_LIMIT = 10;

/** Source counts per category — small, merged into one shortlist. */
const TITLE_LIMIT = 5;
const CATEGORY_LIMIT = 3;
const TAG_LIMIT = 4;
const AUTHOR_LIMIT = 3;
const POPULAR_LIMIT = 4;
const TRENDING_LIMIT = 3;
const RECENT_LIMIT = 3;

interface SuggestionCacheEntry {
  suggestions: SearchSuggestion[];
  storedAt: number;
}

let cache = new Map<string, SuggestionCacheEntry>();

interface SuggestionRow {
  text: string;
  type: string;
  count: number | null;
}

function foldLower(expr: string): string {
  return fold(`lower(${expr})`);
}

/** Folded query param — keeps comparisons accent-insensitive on both sides. */
const QP = fold('$1::text');

/**
 * Title matches, two parenthesized branches:
 *  - prefix: exact prefix on the folded title — served by the
 *    `idx_blog_posts_title_unaccent_trgm` GIN index (trgm prefix ops).
 *  - fuzzy:  word_similarity above threshold catches typo-ish prefixes.
 * Each UNION member needs parentheses for its own ORDER BY/LIMIT.
 */
function titlePrefixSql(): string {
  const title = foldLower('title');
  return `
    (SELECT title AS text, 'title' AS type, NULL::int AS count
     FROM blog_posts
     WHERE status IN ${PUBLIC_STATUSES}
       AND ${title} LIKE ${QP} || '%'
       AND ${title} <> ${QP}
     ORDER BY "viewCount" DESC
     LIMIT ${TITLE_LIMIT})
    UNION ALL
    (SELECT title AS text, 'title' AS type, NULL::int AS count
     FROM blog_posts
     WHERE status IN ${PUBLIC_STATUSES}
       AND ${title} NOT LIKE ${QP} || '%'
       AND word_similarity(${QP}, ${title}) >= $2::real
     ORDER BY word_similarity(${QP}, ${title}) DESC
     LIMIT ${TITLE_LIMIT})
  `;
}

/** Category labels with post counts (10 enum values — cheap live query). */
function categorySql(): string {
  const label = foldLower('category_label(category::text)');
  return `
    (SELECT category_label(category::text) AS text, 'category' AS type,
            count(*)::int AS count
     FROM blog_posts
     WHERE status IN ${PUBLIC_STATUSES}
       AND ${label} LIKE ${QP} || '%'
     GROUP BY category
     ORDER BY count(*) DESC
     LIMIT ${CATEGORY_LIMIT})
  `;
}

/** Tags — matview first (post_count), live aggregate fallback. */
function tagSql(): string {
  return `
    (SELECT name AS text, 'tag' AS type, post_count AS count
     FROM mv_popular_tags
     WHERE ${foldLower('name')} LIKE ${QP} || '%'
     ORDER BY post_count DESC, total_views DESC
     LIMIT ${TAG_LIMIT})
    UNION ALL
    (SELECT t.name AS text, 'tag' AS type, count(*)::int AS count
     FROM blog_tags t
     JOIN blog_post_tags pt ON pt."tagId" = t.id
     JOIN blog_posts bp ON bp.id = pt."postId"
                       AND bp.status IN ${PUBLIC_STATUSES}
     WHERE ${foldLower('t.name')} LIKE ${QP} || '%'
       AND NOT EXISTS (SELECT 1 FROM mv_popular_tags mv WHERE mv.tag_id = t.id)
     GROUP BY t.name
     ORDER BY count(*) DESC
     LIMIT ${TAG_LIMIT})
  `;
}

/** Author display names from the denormalized author_name column. */
function authorSql(): string {
  return `
    (SELECT author_name AS text, 'author' AS type, count(*)::int AS count
     FROM blog_posts
     WHERE status IN ${PUBLIC_STATUSES}
       AND author_name IS NOT NULL
       AND ${foldLower('author_name')} LIKE ${QP} || '%'
     GROUP BY author_name
     ORDER BY count(*) DESC
     LIMIT ${AUTHOR_LIMIT})
  `;
}

/**
 * Historical search terms — matviews first, live aggregates as fallback.
 *
 * The `NOT EXISTS` guards on mv_popular_search_terms make the live branch
 * a no-op whenever the matview is populated (its unique index guarantees
 * every 30-day term is present there). mv_trending_searches has no LIMIT,
 * so no live trending fallback exists — the 24h window is too short for
 * reliable live aggregation and growth_score needs the windowed compare.
 */
function historicalSql(recentSql: string): string {
  return `
    -- popular: matview
    (SELECT normalized AS text, 'popular' AS type, search_count::int AS count
     FROM mv_popular_search_terms
     WHERE ${fold('normalized')} LIKE ${QP} || '%'
     ORDER BY search_count DESC
     LIMIT ${POPULAR_LIMIT})
    UNION ALL
    -- popular: live fallback (only while the matview is empty / partial)
    (SELECT sq.normalized AS text, 'popular' AS type, count(*)::int AS count
     FROM search_queries sq
     WHERE sq.created_at >= now() - interval '30 days'
       AND sq.result_count > 0
       AND ${fold('sq.normalized')} LIKE ${QP} || '%'
       AND NOT EXISTS (
         SELECT 1 FROM mv_popular_search_terms mv
         WHERE mv.normalized = sq.normalized
       )
     GROUP BY sq.normalized
     ORDER BY count(*) DESC
     LIMIT ${POPULAR_LIMIT})
    UNION ALL
    -- trending: matview only (windowed growth score)
    (SELECT normalized AS text, 'trending' AS type, recent_count::int AS count
     FROM mv_trending_searches
     WHERE ${fold('normalized')} LIKE ${QP} || '%'
     ORDER BY growth_score DESC, recent_count DESC
     LIMIT ${TRENDING_LIMIT})
    ${recentSql}
  `;
}

export const SuggestionService = {
  /**
   * Return up to `limit` merged suggestions for a query prefix.
   * Throws SearchValidationError on missing/too-long queries.
   */
  async suggest(
    rawQuery: string | null,
    limit?: number,
    sessionId?: string
  ): Promise<SearchSuggestion[]> {
    if (!rawQuery || rawQuery.trim().length === 0) {
      throw new SearchValidationError('Query parameter "q" is required');
    }
    const q = rawQuery.trim().replace(/\s+/g, ' ').toLowerCase();
    if (q.length > QUERY_MAX_LENGTH) {
      throw new SearchValidationError(
        `Query too long (max ${QUERY_MAX_LENGTH} characters)`
      );
    }

    const n =
      typeof limit === 'number' && Number.isFinite(limit)
        ? Math.min(Math.max(1, Math.floor(limit)), MAX_SUGGESTION_LIMIT)
        : DEFAULT_SUGGESTION_LIMIT;

    const config = await ConfigService.getConfig();
    const ttlMs = Math.max(1, config.ttls.autocompleteSec) * 1000;
    const sid = sessionId && sessionId.trim() ? sessionId.trim() : null;
    const key = `${q}::${n}::${sid ?? ''}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.storedAt < ttlMs) {
      return hit.suggestions;
    }

    // Recent-history branch is session-scoped — never return another
    // user's queries. Without a session id it is omitted entirely.
    const recentSql = sid
      ? `
    UNION ALL
    (SELECT DISTINCT ON (normalized)
            normalized AS text, 'recent' AS type, NULL::int AS count
     FROM search_queries
     WHERE session_id = $3::text
       AND created_at >= now() - interval '7 days'
       AND ${fold('normalized')} LIKE ${QP} || '%'
     ORDER BY normalized, created_at DESC
     LIMIT ${RECENT_LIMIT})
  `
      : '';

    const sql = `
      ${titlePrefixSql()}
      UNION ALL
      ${categorySql()}
      UNION ALL
      ${tagSql()}
      UNION ALL
      ${authorSql()}
      UNION ALL
      ${historicalSql(recentSql)}
    `;

    const params: unknown[] = [q, config.thresholds.trigramSimThreshold];
    if (sid) params.push(sid);

    const rows = await prisma.$queryRawUnsafe<SuggestionRow[]>(sql, ...params);

    const suggestions = mergeSuggestions(rows, n, q);

    cache.set(key, { suggestions, storedAt: Date.now() });
    // Opportunistic prune — the cache is keyed by query so it stays small.
    if (cache.size > 500) {
      const now = Date.now();
      cache = new Map(
        [...cache].filter(([, v]) => now - v.storedAt < ttlMs)
      );
    }

    return suggestions;
  },

  /** Test/admin hook — drop the in-memory cache. */
  invalidate(): void {
    cache = new Map();
  },
};

/**
 * Merge source rows: drop exact self-matches, dedupe by normalized text
 * (higher-priority source wins), cap at `limit`. UNION ALL does not
 * preserve branch order, so priority is re-established via TYPE_PRIORITY.
 */
const TYPE_PRIORITY: Record<SearchSuggestion['type'], number> = {
  title: 0,
  category: 1,
  tag: 2,
  author: 3,
  popular: 4,
  trending: 5,
  recent: 6,
};

function mergeSuggestions(
  rows: SuggestionRow[],
  limit: number,
  query: string
): SearchSuggestion[] {
  const valid = rows.filter((r) => r.text && r.text.trim());
  valid.sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type as SearchSuggestion['type']] ?? 9;
    const pb = TYPE_PRIORITY[b.type as SearchSuggestion['type']] ?? 9;
    return pa - pb;
  });

  const seen = new Set<string>([query]);
  const out: SearchSuggestion[] = [];

  for (const row of valid) {
    const text = row.text.trim();
    const norm = text.toLowerCase();
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);

    const suggestion: SearchSuggestion = {
      text,
      type: row.type as SearchSuggestion['type'],
    };
    if (typeof row.count === 'number' && row.count >= 0) {
      suggestion.count = row.count;
    }
    out.push(suggestion);
    if (out.length >= limit) break;
  }

  return out;
}
