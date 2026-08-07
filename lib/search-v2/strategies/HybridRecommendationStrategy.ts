/**
 * HybridRecommendationStrategy — the Phase 4 Postgres implementation of the
 * RecommendationStrategy interface (§12.14).
 *
 * Execution strategy (§12.9):
 *   1. Candidate generation — indexed/cheap UNION of tag overlap, same
 *      category, trigram title similarity and popularity leaders, bounded by
 *      `candidateLimit` (search_configuration, default 200).
 *   2. Exact scoring on that bounded set only — O(candidateLimit) regardless
 *      of table size.
 *
 * Score formula (§7, weights sum to 1.0):
 *   0.35 tag Jaccard + 0.20 same category + 0.15 title trigram similarity
 *   + 0.15 FTS similarity (source title tsquery vs candidate vector)
 *   + 0.05 shared-keyword Jaccard + 0.05 freshness proximity
 *   + 0.05 popularity/reading-time proximity
 *
 * Weights are §7 seeded defaults; they can be overridden at runtime via
 * search_configuration keys (`relatedTagWeight`, …) without a deploy.
 * Phase 8C re-weights this formula to include domain-concept overlap.
 */

import { prisma } from '@/lib/prisma';
import { ConfigService } from '../ConfigService';
import { fold, PUBLIC_STATUSES } from '../sql';
import type { PostRef, RecommendationStrategy, RelatedCandidate } from './types';

/** §7 default relationship weights (sum = 1.0). */
const DEFAULT_RELATED_WEIGHTS = {
  tag: 0.35,
  category: 0.2,
  titleSim: 0.15,
  fts: 0.15,
  keywords: 0.05,
  freshness: 0.05,
  popularity: 0.05,
};

/** Popularity leaders added to the candidate pool (bounded constant, §12.9). */
const LEADER_LIMIT = 20;

/** Sub-score thresholds that earn a human-readable reason (§7). */
const TITLE_SIM_REASON_MIN = 0.4;
const FTS_SIM_REASON_MIN = 0.05;
const KEYWORD_REASON_MIN = 0.15;

interface RawRelatedRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  publishedAt: Date | null;
  thumbnail: string | null;
  featuredImage: string | null;
  views: number;
  likes: number;
  readingTime: number | null;
  authorName: string | null;
  authorUsername: string | null;
  sharedTags: number;
  tagJaccard: number;
  sameCategory: boolean;
  titleSim: number;
  ftsSim: number;
  keywordJaccard: number;
  freshnessProx: number;
  viewsProx: number;
  readProx: number;
}

/**
 * Build the single-round-trip related-posts query.
 *
 * Params: $1 source post id, $2 candidate limit, $3 source title (for the
 * trigram operator — parameterized so the expression GIN index can be used),
 * $4 source category.
 */
export function buildRelatedQuery(
  sourceId: string,
  candidateLimit: number,
  sourceTitle: string,
  sourceCategory: string
): { sql: string; params: unknown[] } {
  const sql = `
WITH source AS (
  SELECT id, title, category::text AS category, "publishedAt",
         "viewCount", likes,
         coalesce("estimatedReadTime", "readingTime") AS read_time,
         search_vector,
         tsvector_to_array(search_vector) AS lexemes
  FROM blog_posts
  WHERE id = $1::text
),
src_tags AS (
  SELECT "tagId" FROM blog_post_tags WHERE "postId" = $1::text
),
cand AS (
  (SELECT DISTINCT pt."postId" AS id
   FROM blog_post_tags pt
   WHERE pt."tagId" IN (SELECT "tagId" FROM src_tags)
     AND pt."postId" <> $1::text)
  UNION
  (SELECT bp.id
   FROM blog_posts bp
   WHERE bp.category::text = $4::text
     AND bp.id <> $1::text
     AND bp.status IN ${PUBLIC_STATUSES})
  UNION
  (SELECT bp.id
   FROM blog_posts bp
   WHERE bp.id <> $1::text
     AND bp.status IN ${PUBLIC_STATUSES}
     AND ${fold('bp.title')} % ${fold('$3::text')})
  UNION
  (SELECT bp.id
   FROM blog_posts bp
   WHERE bp.id <> $1::text
     AND bp.status IN ${PUBLIC_STATUSES}
   ORDER BY bp."viewCount" DESC, bp."publishedAt" DESC NULLS LAST
   LIMIT ${LEADER_LIMIT})
),
limited AS (
  SELECT id FROM cand ORDER BY id LIMIT $2::int
),
tag_overlap AS (
  SELECT pt."postId" AS id, count(*)::float AS shared
  FROM blog_post_tags pt
  WHERE pt."postId" IN (SELECT id FROM limited)
    AND pt."tagId" IN (SELECT "tagId" FROM src_tags)
  GROUP BY pt."postId"
),
cand_tag_n AS (
  SELECT pt."postId" AS id, count(*)::float AS n
  FROM blog_post_tags pt
  WHERE pt."postId" IN (SELECT id FROM limited)
  GROUP BY pt."postId"
),
src_n AS (
  SELECT count(*)::float AS n FROM src_tags
)
SELECT
  bp.id, bp.slug, bp.title, bp.excerpt, bp.category::text AS category,
  bp."publishedAt", bp."thumbnail", bp."featuredImage",
  bp."viewCount" AS views, bp.likes,
  coalesce(bp."estimatedReadTime", bp."readingTime") AS "readingTime",
  bp.author_name AS "authorName",
  ap.username AS "authorUsername",
  coalesce(tov.shared, 0)::float AS "sharedTags",
  CASE WHEN (coalesce(ctn.n, 0) + sn.n - coalesce(tov.shared, 0)) > 0
       THEN coalesce(tov.shared, 0) / (coalesce(ctn.n, 0) + sn.n - coalesce(tov.shared, 0))
       ELSE 0 END AS "tagJaccard",
  (bp.category::text = s.category) AS "sameCategory",
  similarity(${fold('bp.title')}, ${fold('$3::text')}) AS "titleSim",
  coalesce(ts_rank_cd(
    bp.search_vector,
    plainto_tsquery('english', unaccent(coalesce(s.title, ''))),
    1), 0) AS "ftsSim",
  CASE WHEN cardinality(s.lexemes) > 0
        AND cardinality(tsvector_to_array(bp.search_vector)) > 0
       THEN (SELECT count(*) FROM unnest(s.lexemes) AS x WHERE x = ANY(tsvector_to_array(bp.search_vector)))::float
            / (SELECT count(DISTINCT u) FROM unnest(s.lexemes || tsvector_to_array(bp.search_vector)) AS u)
       ELSE 0 END AS "keywordJaccard",
  CASE WHEN s."publishedAt" IS NULL OR bp."publishedAt" IS NULL THEN 0
       ELSE exp(-abs(extract(epoch FROM (bp."publishedAt" - s."publishedAt")) / 86400.0) / 180.0)
  END AS "freshnessProx",
  exp(-abs(ln(bp."viewCount"::float + 1) - ln(s."viewCount"::float + 1))) AS "viewsProx",
  exp(-abs((coalesce(bp."estimatedReadTime", bp."readingTime", 5)
            - coalesce(s.read_time, 5))::float) / 10.0) AS "readProx"
FROM limited l
JOIN blog_posts bp ON bp.id = l.id
CROSS JOIN source s
CROSS JOIN src_n sn
LEFT JOIN tag_overlap tov ON tov.id = bp.id
LEFT JOIN cand_tag_n ctn ON ctn.id = bp.id
LEFT JOIN author_profiles ap ON ap.id = bp."authorProfileId"
WHERE bp.status IN ${PUBLIC_STATUSES}
  AND bp.id <> $1::text`;

  return { sql, params: [sourceId, candidateLimit, sourceTitle, sourceCategory] };
}

function num(raw: Map<string, number>, key: string, fallback: number): number {
  const v = raw.get(key);
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function buildReasons(row: RawRelatedRow): string[] {
  const reasons: string[] = [];
  if (row.sharedTags >= 1) reasons.push('Matched Tags');
  if (row.sameCategory) reasons.push('Same Category');
  if (row.titleSim >= TITLE_SIM_REASON_MIN) reasons.push('High Title Similarity');
  if (row.ftsSim >= FTS_SIM_REASON_MIN) reasons.push('Related Content');
  if (row.keywordJaccard >= KEYWORD_REASON_MIN) reasons.push('Shared Keywords');
  if (reasons.length === 0) reasons.push('Recommended Reading');
  return reasons;
}

export class HybridRecommendationStrategy implements RecommendationStrategy {
  readonly id = 'hybrid-postgres-related';
  readonly description =
    'Postgres hybrid related-posts engine: 2-step candidate generation (§12.9) + weighted multi-signal scoring (§7).';

  async related(post: PostRef, limit: number): Promise<RelatedCandidate[]> {
    const config = await ConfigService.getConfig();
    const candidateLimit = Math.max(1, Math.floor(config.thresholds.candidateLimit));
    const minScore = config.thresholds.relatedMinScore;

    // Runtime-tunable weights (search_configuration keys; §7 defaults).
    const wTag = num(config.raw, 'relatedTagWeight', DEFAULT_RELATED_WEIGHTS.tag);
    const wCat = num(config.raw, 'relatedCategoryWeight', DEFAULT_RELATED_WEIGHTS.category);
    const wTitle = num(config.raw, 'relatedTitleSimWeight', DEFAULT_RELATED_WEIGHTS.titleSim);
    const wFts = num(config.raw, 'relatedFtsWeight', DEFAULT_RELATED_WEIGHTS.fts);
    const wKw = num(config.raw, 'relatedKeywordsWeight', DEFAULT_RELATED_WEIGHTS.keywords);
    const wFresh = num(config.raw, 'relatedFreshnessWeight', DEFAULT_RELATED_WEIGHTS.freshness);
    const wPop = num(config.raw, 'relatedPopularityWeight', DEFAULT_RELATED_WEIGHTS.popularity);

    // Source context for the parameterized candidate branches. The strategy
    // receives a PostRef, so fetch the minimal source fields once.
    const source = await prisma.blogPost.findUnique({
      where: { id: post.id },
      select: { id: true, title: true, category: true },
    });
    if (!source) return [];

    const { sql, params } = buildRelatedQuery(
      source.id,
      candidateLimit,
      source.title,
      source.category as string
    );

    const rows = await prisma.$queryRawUnsafe<RawRelatedRow[]>(sql, ...params);

    return rows
      .map((row) => {
        const relationshipScore =
          wTag * Number(row.tagJaccard) +
          wCat * (row.sameCategory ? 1 : 0) +
          wTitle * Number(row.titleSim) +
          wFts * Number(row.ftsSim) +
          wKw * Number(row.keywordJaccard) +
          wFresh * Number(row.freshnessProx) +
          wPop * ((Number(row.viewsProx) + Number(row.readProx)) / 2);

        // Extra display fields beyond the RelatedCandidate contract — the
        // service exposes them in the public envelope.
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt,
          category: row.category,
          publishedAt: row.publishedAt,
          thumbnail: row.thumbnail,
          relationshipScore: Math.round(relationshipScore * 10000) / 10000,
          reasons: buildReasons(row),
          featuredImage: row.featuredImage,
          readingTime: row.readingTime === null ? null : Number(row.readingTime),
          views: Number(row.views),
          likes: Number(row.likes),
          authorName: row.authorName,
          authorUsername: row.authorUsername,
        };
      })
      .filter((c) => c.relationshipScore >= minScore)
      .sort(
        (a, b) =>
          b.relationshipScore - a.relationshipScore ||
          (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
      )
      .slice(0, Math.max(1, limit));
  }
}
