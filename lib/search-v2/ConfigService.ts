/**
 * ConfigService — loads search_configuration into a typed SearchConfig.
 *
 * Ranking weights, thresholds and cache TTLs are DB-tunable (§12.3): an
 * admin can update a row and the next search reflects it within the cache
 * window — no deploy. Values are cached in memory for CONFIG_TTL_MS.
 */

import { prisma } from '@/lib/prisma';
import type { CacheTtls, RankingWeights, SearchConfig, SearchThresholds } from './types';

const CONFIG_TTL_MS = 60_000;

/** Fallbacks mirror the seeded defaults in the migration (§12.3). */
const DEFAULT_WEIGHTS: RankingWeights = {
  ftsWeight: 3.0,
  titleWeight: 1.5,
  tagWeight: 1.0,
  categoryWeight: 0.6,
  excerptWeight: 0.8,
  contentWeight: 0.5,
  authorWeight: 0.4,
  freshnessWeight: 0.5,
  popularityWeight: 0.5,
  trigramWeight: 1.0,
  phraseWeight: 1.5,
  exactMatchWeight: 2.0,
  featuredWeight: 0.3,
  manualBoostWeight: 0.4,
};

const DEFAULT_THRESHOLDS: SearchThresholds = {
  trigramSimThreshold: 0.3,
  fuzzyMatchThreshold: 0.4,
  relatedMinScore: 0.05,
  candidateLimit: 200,
  maxBoostTotal: 1.0,
};

const DEFAULT_TTLS: CacheTtls = {
  searchSec: 300,
  autocompleteSec: 60,
  relatedSec: 600,
  suggestionsSec: 900,
};

let cache: SearchConfig | null = null;

function num(raw: Map<string, number>, key: string, fallback: number): number {
  const v = raw.get(key);
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export const ConfigService = {
  /**
   * Return the current SearchConfig, reloading from the DB when the cache
   * is stale or `force` is set (admin mutation busts via force).
   */
  async getConfig(force = false): Promise<SearchConfig> {
    if (!force && cache && Date.now() - cache.loadedAt < CONFIG_TTL_MS) {
      return cache;
    }

    const rows = await prisma.searchConfiguration.findMany();
    const raw = new Map<string, number>();
    for (const row of rows) {
      raw.set(row.key, Number(row.value));
    }

    const weights: RankingWeights = {
      ftsWeight: num(raw, 'ftsWeight', DEFAULT_WEIGHTS.ftsWeight),
      titleWeight: num(raw, 'titleWeight', DEFAULT_WEIGHTS.titleWeight),
      tagWeight: num(raw, 'tagWeight', DEFAULT_WEIGHTS.tagWeight),
      categoryWeight: num(raw, 'categoryWeight', DEFAULT_WEIGHTS.categoryWeight),
      excerptWeight: num(raw, 'excerptWeight', DEFAULT_WEIGHTS.excerptWeight),
      contentWeight: num(raw, 'contentWeight', DEFAULT_WEIGHTS.contentWeight),
      authorWeight: num(raw, 'authorWeight', DEFAULT_WEIGHTS.authorWeight),
      freshnessWeight: num(raw, 'freshnessWeight', DEFAULT_WEIGHTS.freshnessWeight),
      popularityWeight: num(raw, 'popularityWeight', DEFAULT_WEIGHTS.popularityWeight),
      trigramWeight: num(raw, 'trigramWeight', DEFAULT_WEIGHTS.trigramWeight),
      phraseWeight: num(raw, 'phraseWeight', DEFAULT_WEIGHTS.phraseWeight),
      exactMatchWeight: num(raw, 'exactMatchWeight', DEFAULT_WEIGHTS.exactMatchWeight),
      featuredWeight: num(raw, 'featuredWeight', DEFAULT_WEIGHTS.featuredWeight),
      manualBoostWeight: num(raw, 'manualBoostWeight', DEFAULT_WEIGHTS.manualBoostWeight),
    };

    const thresholds: SearchThresholds = {
      trigramSimThreshold: num(raw, 'trigramSimThreshold', DEFAULT_THRESHOLDS.trigramSimThreshold),
      fuzzyMatchThreshold: num(raw, 'fuzzyMatchThreshold', DEFAULT_THRESHOLDS.fuzzyMatchThreshold),
      relatedMinScore: num(raw, 'relatedMinScore', DEFAULT_THRESHOLDS.relatedMinScore),
      candidateLimit: num(raw, 'candidateLimit', DEFAULT_THRESHOLDS.candidateLimit),
      maxBoostTotal: num(raw, 'maxBoostTotal', DEFAULT_THRESHOLDS.maxBoostTotal),
    };

    const ttls: CacheTtls = {
      searchSec: num(raw, 'cacheTtlSearchSec', DEFAULT_TTLS.searchSec),
      autocompleteSec: num(raw, 'cacheTtlAutocompleteSec', DEFAULT_TTLS.autocompleteSec),
      relatedSec: num(raw, 'cacheTtlRelatedSec', DEFAULT_TTLS.relatedSec),
      suggestionsSec: num(raw, 'cacheTtlSuggestionsSec', DEFAULT_TTLS.suggestionsSec),
    };

    cache = { weights, thresholds, ttls, raw, loadedAt: Date.now() };
    return cache;
  },

  /** Test/admin hook — drop the in-memory cache. */
  invalidate(): void {
    cache = null;
  },
};
