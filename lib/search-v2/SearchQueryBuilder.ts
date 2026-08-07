/**
 * SearchQueryBuilder — assembles ONE parameterized SQL statement (§2) that:
 *
 *   1. decides the query mode ladder inside a CTE
 *      (websearch → plainto → prefix:* → synonym-recall → trigram → browse),
 *   2. filters public posts (PUBLISHED/APPROVED) with every §5 filter,
 *   3. scores candidates with the §4 ranking formula (RankingService),
 *   4. paginates with keyset cursors,
 *   5. computes facets + totalResults in the same round trip.
 *
 * Raw SQL lives ONLY in this module + RankingService/SnippetService.
 * User input is bound as $n parameters — never interpolated.
 */

import { buildRankSql, cursorParams, cursorWhere, orderByFor, trendingScoreExpr } from './RankingService';
import { SnippetService } from './SnippetService';
import type { ParsedFilters, RankingWeights, SearchThresholds } from './types';

/** Sort parameter is always $6 — see buildSearchQuery(). */
const SORT_PARAM_INDEX = 6;

export interface BuildSearchQueryOptions {
  weights: RankingWeights;
  thresholds: SearchThresholds;
  /** query-level boost from search_boost_rules (already capped) */
  boostTotal: number;
  /** synonym-expanded terms incl. the original tokens (empty when no query) */
  recallTerms: string[];
}

export interface BuiltSearchQuery {
  sql: string;
  params: unknown[];
}

/**
 * Build the typeahead tsquery text: every token ANDed, LAST token gets `:*`.
 * Returns '' when the query yields no usable tokens (level skipped).
 */
export function buildPrefixTsQuery(q: string): string {
  const tokens = q
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .map((t) => t.replace(/['’]/g, ''))
    .filter(Boolean);
  if (tokens.length === 0) return '';
  return tokens
    .map((t, i) => (i === tokens.length - 1 ? `${t}:*` : t))
    .join(' & ');
}

/**
 * Build the recall tsquery text for websearch_to_tsquery: every expanded
 * term quoted (multi-word terms become phrases), joined with OR.
 * Recall mode ORs originals + synonyms; precision modes never expand.
 */
export function buildRecallTsQuery(terms: string[]): string {
  const cleaned = terms
    .map((t) => t.replace(/"/g, '').trim())
    .filter(Boolean);
  if (cleaned.length === 0) return '';
  return cleaned.map((t) => `"${t}"`).join(' OR ');
}

/** Simple parameter bag — values bound in allocation order. */
class ParamBag {
  readonly values: unknown[] = [];
  add(v: unknown): string {
    this.values.push(v);
    return `$${this.values.length}`;
  }
  get nextIndex(): number {
    return this.values.length + 1;
  }
}

const PUBLIC_STATUSES = `('PUBLISHED','APPROVED')`;

/** Filter WHERE fragments over alias `f`. All values parameterized. */
function buildFilterWhere(f: ParsedFilters, bag: ParamBag): string[] {
  const clauses: string[] = [];

  if (f.categories && f.categories.length > 0) {
    clauses.push(`f.category::text = ANY(${bag.add(f.categories)}::text[])`);
  }

  if (f.tags && f.tags.length > 0) {
    const p = bag.add(f.tags);
    clauses.push(
      `EXISTS (SELECT 1 FROM blog_post_tags pt ` +
        `JOIN blog_tags t ON t.id = pt."tagId" ` +
        `WHERE pt."postId" = f.id AND lower(t.name) = ANY(${p}::text[]))`
    );
  }

  if (f.author) {
    clauses.push(`f.author_name ILIKE '%' || ${bag.add(f.author)}::text || '%'`);
  }

  if (f.featured !== undefined) {
    clauses.push(`f.featured = ${bag.add(f.featured)}::boolean`);
  }

  const readExpr = `coalesce(f."estimatedReadTime", f."readingTime")`;
  if (f.readingTimeMin !== undefined) {
    clauses.push(`${readExpr} >= ${bag.add(f.readingTimeMin)}::int`);
  }
  if (f.readingTimeMax !== undefined) {
    clauses.push(`${readExpr} <= ${bag.add(f.readingTimeMax)}::int`);
  }

  if (f.dateFrom) {
    clauses.push(`f."publishedAt" >= ${bag.add(f.dateFrom.toISOString())}::timestamp`);
  }
  if (f.dateTo) {
    clauses.push(`f."publishedAt" <= ${bag.add(f.dateTo.toISOString())}::timestamp`);
  }

  if (f.minViews !== undefined) clauses.push(`f."viewCount" >= ${bag.add(f.minViews)}::int`);
  if (f.maxViews !== undefined) clauses.push(`f."viewCount" <= ${bag.add(f.maxViews)}::int`);
  if (f.minLikes !== undefined) clauses.push(`f.likes >= ${bag.add(f.minLikes)}::int`);
  if (f.maxLikes !== undefined) clauses.push(`f.likes <= ${bag.add(f.maxLikes)}::int`);

  return clauses;
}

const TAGS_ARRAY_EXPR =
  `CASE WHEN coalesce(f.tag_names, '') = '' THEN '{}'::text[] ` +
  `ELSE string_to_array(regexp_replace(f.tag_names, '\\s+', ' ', 'g'), ' ') END`;

export function buildSearchQuery(
  filters: ParsedFilters,
  opts: BuildSearchQueryOptions
): BuiltSearchQuery {
  const bag = new ParamBag();

  // ---- fixed parameter layout ($1–$6) ---------------------------------
  const hasQuery = !!filters.q;
  const qRaw = filters.q ?? '';
  const prefixTq = hasQuery ? buildPrefixTsQuery(qRaw) : '';
  const recallTq = hasQuery ? buildRecallTsQuery(opts.recallTerms) : '';

  bag.add(qRaw); // $1 — normalized user query
  bag.add(prefixTq); // $2 — to_tsquery text for the prefix level
  bag.add(recallTq); // $3 — websearch text for the recall level
  bag.add(opts.boostTotal); // $4 — manual boost (already capped)
  bag.add(opts.thresholds.trigramSimThreshold); // $5 — trigram candidacy threshold
  bag.add(filters.sort); // $6 — sort option (drives lazy trending cost)

  // ---- filter clauses ($7+) --------------------------------------------
  const filterClauses = buildFilterWhere(filters, bag);

  // ---- cursor clause (allocated after filters) -------------------------
  let cursorClause = '';
  if (filters.cursor) {
    const paramIndex = { value: bag.nextIndex };
    cursorClause = cursorWhere(filters.sort, paramIndex);
    for (const v of cursorParams(filters.sort, filters.cursor)) {
      bag.add(v);
    }
  }

  // ---- limit (always last) ---------------------------------------------
  const limitParam = bag.add(filters.limit + 1); // +1 detects hasMore

  const rank = buildRankSql(opts.weights, {
    queryParam: hasQuery ? 1 : 0,
    boostParam: 4,
    trgmThresholdParam: 5,
  });

  const trendingScore = trendingScoreExpr(SORT_PARAM_INDEX);

  // ---- ladder CTE --------------------------------------------------------
  // First level with ≥1 public match wins. EXISTS short-circuits on the GIN
  // tsvector index. to_tsquery can raise on bad input, so the prefix level
  // is guarded by an explicit non-empty check before the EXISTS.
  const webExpr = `websearch_to_tsquery('english', f_unaccent(lower(p.q_raw)))`;
  const plainExpr = `plainto_tsquery('english', f_unaccent(lower(p.q_raw)))`;
  const prefixExpr = `to_tsquery('english', p.prefix_tq)`;
  const recallExpr = `websearch_to_tsquery('english', p.recall_tq)`;

  const ladderExists = (tsq: string) =>
    `EXISTS (SELECT 1 FROM blog_posts b ` +
    `WHERE b.status IN ${PUBLIC_STATUSES} AND b.search_vector @@ ${tsq})`;

  const sql = `
WITH p AS (
  SELECT
    $1::text AS q_raw,
    $2::text AS prefix_tq,
    $3::text AS recall_tq,
    $4::real AS boost,
    $5::real AS trgm_threshold,
    $6::text AS sort
),
ladder AS (
  SELECT
    CASE
      WHEN p.q_raw = '' THEN 'browse'
      WHEN hits.web_hit THEN 'web'
      WHEN hits.plain_hit THEN 'plain'
      WHEN hits.prefix_hit THEN 'prefix'
      WHEN hits.recall_hit THEN 'recall'
      ELSE 'trigram'
    END AS mode_label,
    CASE
      WHEN hits.web_hit THEN ${webExpr}
      WHEN hits.plain_hit THEN ${plainExpr}
      WHEN hits.prefix_hit THEN ${prefixExpr}
      WHEN hits.recall_hit THEN ${recallExpr}
      ELSE NULL
    END AS effective_tq,
    f_unaccent(lower(p.q_raw)) AS q_norm
  FROM p
  CROSS JOIN (
    SELECT
      (p.q_raw <> '' AND ${ladderExists(webExpr)}) AS web_hit,
      (p.q_raw <> '' AND ${ladderExists(plainExpr)}) AS plain_hit,
      (p.prefix_tq <> '' AND ${ladderExists(prefixExpr)}) AS prefix_hit,
      (p.recall_tq <> '' AND ${ladderExists(recallExpr)}) AS recall_hit
    FROM p
  ) hits
),
filtered AS (
  SELECT f.*
  FROM blog_posts f
  WHERE f.status IN ${PUBLIC_STATUSES}
    ${filterClauses.length > 0 ? 'AND ' + filterClauses.join('\n    AND ') : ''}
),
scored AS (
  SELECT
    f.id,
    f.slug,
    f.title,
    f.excerpt,
    ${SnippetService.snippetExpr()} AS snippet,
    ${SnippetService.highlightedTitleExpr()} AS "highlightedTitle",
    f.category::text AS category,
    f.featured,
    f."publishedAt",
    coalesce(f."estimatedReadTime", f."readingTime") AS "readingTime",
    f."viewCount" AS views,
    f.likes,
    f."shareCount" AS shares,
    ${TAGS_ARRAY_EXPR} AS tags,
    f.author_name AS "authorName",
    f."authorId",
    f."authorProfileId",
    ap.username AS "authorUsername",
    f.thumbnail,
    f."featuredImage",
    (${rank.ftsRank})::real AS "ftsRank",
    (${rank.titleSim})::real AS "titleSim",
    (${rank.tagSim})::real AS "tagSim",
    (${rank.categorySim})::real AS "categorySim",
    (${rank.authorSim})::real AS "authorSim",
    (${rank.exactMatch})::int AS "exactMatch",
    (${rank.phraseInTitle})::int AS "phraseInTitle",
    (${rank.popularity})::real AS popularity,
    (${rank.freshness})::real AS freshness,
    (p.boost + CASE WHEN f.featured THEN ${opts.weights.featuredWeight} ELSE 0 END)::real AS "boostTotal",
    ${rank.score} AS score,
    (${trendingScore})::numeric AS trending_score
  FROM filtered f
  LEFT JOIN author_profiles ap ON ap.id = f."authorProfileId"
  CROSS JOIN ladder c, p
  WHERE ${rank.matchWhere}
),
facets AS (
  SELECT
    (SELECT coalesce(json_agg(row_to_json(x)), '[]'::json)
       FROM (SELECT f.category::text AS name, count(*)::int AS count
               FROM filtered f
              GROUP BY 1
              ORDER BY count DESC
              LIMIT 20) x) AS categories,
    (SELECT coalesce(json_agg(row_to_json(y)), '[]'::json)
       FROM (SELECT lower(regexp_replace(trim(tag), '\\s+', ' ', 'g')) AS name, count(*)::int AS count
               FROM filtered f
               CROSS JOIN LATERAL unnest(string_to_array(regexp_replace(coalesce(f.tag_names, ''), '\\s+', ' ', 'g'), ' ')) AS tag
              WHERE trim(tag) <> ''
              GROUP BY 1
              ORDER BY count DESC
              LIMIT 20) y) AS tags
),
page AS (
  SELECT s.*
  FROM scored s
  ${cursorClause ? `WHERE ${cursorClause}` : ''}
  ORDER BY ${orderByFor(filters.sort)}
  LIMIT ${limitParam}
)
SELECT
  pg.*,
  (SELECT count(*) FROM scored)::int AS "totalResults",
  (SELECT categories FROM facets) AS facet_categories,
  (SELECT tags FROM facets) AS facet_tags,
  c.mode_label,
  c.q_norm
FROM page pg
CROSS JOIN ladder c
ORDER BY ${orderByFor(filters.sort)}
`;

  return { sql, params: bag.values };
}
