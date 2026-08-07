/**
 * RankingService — SQL expressions for the §4 ranking formula plus the
 * ORDER BY / keyset-cursor machinery for every sort option.
 *
 * Expressions assume the QueryBuilder CTE layout:
 *   - `f`   = blog_posts row alias (filtered candidates)
 *   - `c`   = `chosen` CTE row (cross-joined, exactly one row) with columns:
 *       effective_tq tsquery|null — null ⇒ trigram/browse mode
 *       mode_label   'browse'|'fts'|'recall'|'trigram'
 *       web_hits / plain_hits / prefix_hits / recall_hits  (bigint)
 *
 * The mode ladder (websearch → plainto → prefix:* → recall → trigram) is
 * decided inside the CTE so the entire search is ONE round trip (§2).
 *
 * All weights are runtime-tunable via search_configuration (ConfigService).
 * User input is only ever bound as $n parameters — never interpolated.
 */

import type { RankingWeights, SortOption } from './types';

export interface RankSqlParams {
  /** $n of the normalized (unaccented, lowercased) query text — 0 when no query */
  queryParam: number;
  /** $n of the summed manual boost weight for this query */
  boostParam: number;
  /** $n of the trigram similarity threshold for trigram-mode candidacy */
  trgmThresholdParam: number;
}

export interface RankSql {
  /** WHERE predicate deciding which filtered rows are candidates */
  matchWhere: string;
  /** full score expression (alias it `score`) */
  score: string;
  /** individual sub-score expressions (for explainability §12.13) */
  ftsRank: string;
  titleSim: string;
  tagSim: string;
  categorySim: string;
  authorSim: string;
  exactMatch: string;
  phraseInTitle: string;
  popularity: string;
  freshness: string;
}

/** Build the match predicate and all sub-score expressions. */
export function buildRankSql(weights: RankingWeights, p: RankSqlParams): RankSql {
  const hasQuery = p.queryParam !== 0;

  // Pre-rendered $-prefixed parameter references for SQL interpolation.
  const qp = `$${p.queryParam}::text`;
  const trgm = `$${p.trgmThresholdParam}::real`;
  const bp = `$${p.boostParam}::real`;

  // ---- candidate match predicate -------------------------------------
  // browse: everything. fts/recall: vector @@ chosen tsquery.
  // trigram: word_similarity on title/tags above threshold (GIN-trgm paths).
  const ftsCond = 'f.search_vector @@ c.effective_tq';
  const trgmCond = hasQuery
    ? `(` +
      `word_similarity(${qp}, f_unaccent(lower(f.title))) >= ${trgm} ` +
      `OR word_similarity(${qp}, f_unaccent(lower(coalesce(f.tag_names, '')))) >= ${trgm}` +
      `)`
    : 'TRUE';

  const matchWhere =
    `(c.mode_label = 'browse' ` +
    `OR (c.effective_tq IS NOT NULL AND ${ftsCond}) ` +
    `OR (c.effective_tq IS NULL AND ${trgmCond}))`;

  // ---- sub-scores -------------------------------------------------------
  const ftsRank =
    `CASE WHEN c.effective_tq IS NULL THEN 0 ` +
    `ELSE ts_rank_cd(f.search_vector, c.effective_tq, 1) END`;

  const phraseFts =
    `CASE WHEN c.effective_tq IS NULL THEN 0 ` +
    `WHEN setweight(to_tsvector('english', f_unaccent(coalesce(f.title, ''))), 'A') @@ c.effective_tq THEN 1 ` +
    `ELSE 0 END`;

  const titleSim = hasQuery
    ? `word_similarity(${qp}, f_unaccent(lower(f.title)))`
    : '0';
  const exactMatch = hasQuery
    ? `CASE WHEN f_unaccent(lower(f.title)) = ${qp} THEN 1 ELSE 0 END`
    : '0';
  const phraseInTitle = hasQuery
    ? `CASE WHEN f_unaccent(lower(f.title)) LIKE '%' || ${qp} || '%' THEN 1 ELSE 0 END`
    : '0';
  const tagSim = hasQuery
    ? `word_similarity(${qp}, f_unaccent(lower(coalesce(f.tag_names, ''))))`
    : '0';
  const categorySim = hasQuery
    ? `word_similarity(${qp}, f_unaccent(lower(category_label(f.category::text))))`
    : '0';
  const authorSim = hasQuery
    ? `word_similarity(${qp}, f_unaccent(lower(coalesce(f.author_name, ''))))`
    : '0';

  // Trigram slot: only active in recall/trigram modes — in fts modes the
  // title similarity is already covered by titleWeight.
  const trigramRecall = hasQuery
    ? `CASE WHEN c.mode_label IN ('trigram', 'recall') THEN ${titleSim} ELSE 0 END`
    : '0';

  // Popularity: log-scaled blend — viewCount is canonical (`views` deprecated).
  const popularity =
    '(ln(1 + f."viewCount") * 0.6 + ln(1 + f.likes) * 0.25 + ln(1 + f."shareCount") * 0.15) / 10';

  // Freshness: exp decay — ~0.5 at 6 months, asymptotic toward 0.
  const freshness =
    'exp(-extract(epoch from (now() - coalesce(f."publishedAt", f."createdAt"))) / (180 * 86400.0))';

  // Manual boost: query-level keyword boosts (already capped by
  // maxBoostTotal in BoostRuleService) + featured-post bonus.
  const boostExpr =
    `(CASE WHEN f.featured THEN ${weights.featuredWeight} ELSE 0 END) + ${bp}`;

  const score =
    `(${weights.ftsWeight} * (${ftsRank})` +
    ` + ${weights.titleWeight} * (${titleSim})` +
    ` + ${weights.tagWeight} * GREATEST(${tagSim}, ${categorySim})` +
    ` + ${weights.exactMatchWeight} * (${exactMatch})` +
    ` + ${weights.phraseWeight} * GREATEST(${phraseInTitle}, ${phraseFts}::real)` +
    ` + ${weights.categoryWeight} * (${categorySim})` +
    ` + ${weights.authorWeight} * (${authorSim})` +
    ` + ${weights.popularityWeight} * (${popularity})` +
    ` + ${weights.freshnessWeight} * (${freshness})` +
    ` + ${weights.trigramWeight} * (${trigramRecall})` +
    ` + (${boostExpr}))::real`;

  return {
    matchWhere,
    score,
    ftsRank,
    titleSim,
    tagSim,
    categorySim,
    authorSim,
    exactMatch,
    phraseInTitle,
    popularity,
    freshness,
  };
}

/**
 * Trending score (§5): views in the last 7 days from blog_post_views,
 * blended with likes. The 7-day count subquery is only evaluated when the
 * active sort is 'trending' — CASE short-circuits for every other sort.
 */
export function trendingScoreExpr(sortParamIndex: number): string {
  return (
    `(CASE WHEN $${sortParamIndex}::text = 'trending' THEN ` +
    `(SELECT count(*) FROM blog_post_views v ` +
    `WHERE v."postId" = f.id AND v."createdAt" >= now() - interval '7 days') ` +
    `ELSE 0 END) + f.likes * 0.5`
  );
}

/**
 * ORDER BY clause per sort option. Operates on the final page subquery
 * output names: score, trending_score, "publishedAt", id, views, shares, title.
 */
export function orderByFor(sort: SortOption): string {
  switch (sort) {
    case 'relevance':
      return 'score DESC, "publishedAt" DESC NULLS LAST, id ASC';
    case 'newest':
      return '"publishedAt" DESC NULLS LAST, id ASC';
    case 'oldest':
      return '"publishedAt" ASC NULLS LAST, id ASC';
    case 'trending':
      return 'trending_score DESC, "publishedAt" DESC NULLS LAST, id ASC';
    case 'views':
      return 'views DESC, id ASC';
    case 'shares':
      return 'shares DESC, id ASC';
    case 'alpha':
      return 'lower(title) ASC, id ASC';
  }
}

/**
 * Keyset WHERE fragment for cursor pagination — selects rows strictly AFTER
 * the cursor position for the given sort. `paramIndex.value` is incremented
 * for every consumed parameter; bind values via cursorParams() in the same
 * order. References bare output column names of the page subquery.
 */
export function cursorWhere(sort: SortOption, paramIndex: { value: number }): string {
  const next = () => `$${paramIndex.value++}`;

  if (sort === 'relevance') {
    const s = next(); // score
    const d = next(); // publishedAt
    const i = next(); // id
    // ORDER BY score DESC, publishedAt DESC NULLS LAST, id ASC
    return `(` +
      `score < ${s}::real ` +
      `OR (score = ${s}::real AND (` +
      `"publishedAt" < ${d}::timestamp ` +
      `OR "publishedAt" IS NULL ` +
      `OR ("publishedAt" = ${d}::timestamp AND id > ${i}::text)` +
      `))` +
      `)`;
  }

  if (sort === 'newest') {
    const d = next();
    const i = next();
    // ORDER BY publishedAt DESC NULLS LAST, id ASC
    return `(` +
      `"publishedAt" < ${d}::timestamp ` +
      `OR "publishedAt" IS NULL ` +
      `OR ("publishedAt" = ${d}::timestamp AND id > ${i}::text)` +
      `)`;
  }

  if (sort === 'oldest') {
    const d = next();
    const i = next();
    // ORDER BY publishedAt ASC NULLS LAST, id ASC
    return `(` +
      `("publishedAt" > ${d}::timestamp OR "publishedAt" IS NULL) ` +
      `OR ("publishedAt" = ${d}::timestamp AND id > ${i}::text)` +
      `)`;
  }

  if (sort === 'trending') {
    const n = next(); // trending_score
    const d = next();
    const i = next();
    return `(` +
      `trending_score < ${n}::numeric ` +
      `OR (trending_score = ${n}::numeric AND (` +
      `"publishedAt" < ${d}::timestamp ` +
      `OR "publishedAt" IS NULL ` +
      `OR ("publishedAt" = ${d}::timestamp AND id > ${i}::text)` +
      `))` +
      `)`;
  }

  if (sort === 'views' || sort === 'shares') {
    const col = sort === 'views' ? 'views' : 'shares';
    const n = next();
    const i = next();
    return `(` +
      `${col} < ${n}::integer ` +
      `OR (${col} = ${n}::integer AND id > ${i}::text)` +
      `)`;
  }

  // alpha
  const t = next(); // lower(title)
  const i = next();
  return `(` +
    `lower(title) > ${t}::text ` +
    `OR (lower(title) = ${t}::text AND id > ${i}::text)` +
    `)`;
}

/** Push the cursor's bound values in the order cursorWhere consumed them. */
export function cursorParams(
  sort: SortOption,
  cursor: { s?: number; d?: string; n?: number; t?: string; i: string }
): unknown[] {
  switch (sort) {
    case 'relevance':
      return [cursor.s ?? 0, cursor.d ?? null, cursor.i];
    case 'newest':
    case 'oldest':
      return [cursor.d ?? null, cursor.i];
    case 'trending':
      return [cursor.n ?? 0, cursor.d ?? null, cursor.i];
    case 'views':
    case 'shares':
      return [cursor.n ?? 0, cursor.i];
    case 'alpha':
      return [cursor.t ?? '', cursor.i];
  }
}
