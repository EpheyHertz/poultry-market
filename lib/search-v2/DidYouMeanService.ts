/**
 * DidYouMeanService — typo correction (§6).
 *
 * Finds the best correction for a weak query via
 * `word_similarity(query, candidate)`, accepting only candidates with
 * similarity > 0.5 that are materially better than the query itself.
 *
 * Candidate corpus — short phrases only (a banner can't show a sentence):
 *   - tag names                    (always backed by ≥1 public post)
 *   - category labels              (always backed by ≥1 public post)
 *   - popular search terms         (matview + live fallback, results-bearing)
 *   - trending search terms        (matview)
 * Every source guarantees the correction leads to actual results, which
 * operationalizes "materially better than the query's own hit score".
 *
 * The caller (SearchService) only invokes this for weak queries
 * (zero/few hits or trigram-fallback mode), so correct queries never pay
 * for it. Results are cached in memory for `ttls.autocompleteSec`.
 *
 * Parameters: $1 = folded query. The acceptance threshold (SIM_THRESHOLD)
 * is applied in JS so negative results are cached identically.
 */

import { prisma } from '@/lib/prisma';
import { ConfigService } from './ConfigService';
import { fold, PUBLIC_STATUSES } from './sql';
import { SearchValidationError } from './types';

/** Plan §6: accept corrections with similarity strictly above this. */
const SIM_THRESHOLD = 0.5;

/** Queries shorter than this produce noisy trigram similarity. */
const MIN_QUERY_LENGTH = 3;

/** Cache: normalized query → correction (null cached too — negative hits). */
let cache = new Map<string, { correction: string | null; storedAt: number }>();

interface DymRow {
  candidate: string;
  sim: number;
}

/**
 * Corpus of short, results-backed phrases.
 *
 * The live popular-search fallback only runs while mv_popular_search_terms
 * is empty/partial (matview refresh arrives in Phase 8C). Terms must have
 * been searched ≥2 times AND produced results — that evidence is what
 * makes them safe corrections.
 */
function candidateCorpusSql(): string {
  return `
    -- tag names
    (SELECT t.name AS candidate FROM blog_tags t)
    UNION ALL
    -- category labels (10 enum values)
    (SELECT DISTINCT category_label(category::text) AS candidate
     FROM blog_posts
     WHERE status IN ${PUBLIC_STATUSES} AND category IS NOT NULL)
    UNION ALL
    -- popular search terms: matview
    (SELECT normalized AS candidate FROM mv_popular_search_terms)
    UNION ALL
    -- popular search terms: live fallback
    (SELECT sq.normalized AS candidate
     FROM search_queries sq
     WHERE sq.created_at >= now() - interval '30 days'
       AND sq.result_count > 0
       AND NOT EXISTS (
         SELECT 1 FROM mv_popular_search_terms mv
         WHERE mv.normalized = sq.normalized
       )
     GROUP BY sq.normalized
     HAVING count(*) >= 2)
    UNION ALL
    -- trending search terms: matview
    (SELECT normalized AS candidate FROM mv_trending_searches)
  `;
}

export const DidYouMeanService = {
  /**
   * Return a correction for `rawQuery`, or null when the query is fine
   * (or too short / too dissimilar from anything in the corpus).
   */
  async suggest(rawQuery: string): Promise<string | null> {
    if (!rawQuery || rawQuery.trim().length === 0) {
      throw new SearchValidationError('Query is required for didYouMean');
    }
    const q = rawQuery.trim().replace(/\s+/g, ' ').toLowerCase();
    if (q.length < MIN_QUERY_LENGTH) return null;

    const config = await ConfigService.getConfig();
    const ttlMs = Math.max(1, config.ttls.autocompleteSec) * 1000;

    const hit = cache.get(q);
    if (hit && Date.now() - hit.storedAt < ttlMs) {
      return hit.correction;
    }

    // word_similarity(first, second): best similarity between a substring
    // of the first string and any word of the second — query first,
    // candidate second (same orientation as the ranking strategy).
    const sql = `
      WITH candidates AS (${candidateCorpusSql()})
      SELECT candidate,
             word_similarity(${fold('$1::text')}, ${fold('lower(candidate)')}) AS sim
      FROM candidates
      WHERE candidate IS NOT NULL AND candidate <> ''
        -- never rank the query itself (typos can be popular terms too)
        AND ${fold('lower(candidate)')} <> ${fold('$1::text')}
      ORDER BY sim DESC, length(candidate) ASC
      LIMIT 1
    `;

    const rows = await prisma.$queryRawUnsafe<DymRow[]>(sql, q);

    let correction: string | null = null;
    const top = rows[0];
    if (top && Number(top.sim) > SIM_THRESHOLD) {
      const text = top.candidate.trim();
      if (text) {
        correction = text;
      }
    }

    cache.set(q, { correction, storedAt: Date.now() });
    if (cache.size > 500) {
      const now = Date.now();
      cache = new Map([...cache].filter(([, v]) => now - v.storedAt < ttlMs));
    }

    return correction;
  },

  /** Test/admin hook — drop the in-memory cache. */
  invalidate(): void {
    cache = new Map();
  },
};
