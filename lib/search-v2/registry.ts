/**
 * Strategy registry (§12.14) — the seam where future engines plug in.
 *
 * The public API contract never changes; only the registered strategy
 * implementations do. A VectorSearchStrategy / external recommendation
 * engine can be registered later without touching routes or SearchService.
 */

import { PostgresFtsSearchStrategy } from './strategies/PostgresFtsSearchStrategy';
import { SqlRankingStrategy } from './strategies/SqlRankingStrategy';
import { HybridRecommendationStrategy } from './strategies/HybridRecommendationStrategy';
import type { RecommendationStrategy } from './strategies/types';

export interface SearchEngineBundle {
  search: PostgresFtsSearchStrategy;
  ranking: SqlRankingStrategy;
  /** Phase 4 — hybrid related-posts engine (swappable via register()). */
  related: RecommendationStrategy;
}

let current: SearchEngineBundle | null = null;

export const EngineRegistry = {
  register(bundle: SearchEngineBundle): void {
    current = bundle;
  },

  get(): SearchEngineBundle {
    if (!current) {
      // Auto-register the default Postgres engine on first use.
      ensureDefaultEngine();
    }
    return current as SearchEngineBundle;
  },

  isRegistered(): boolean {
    return current !== null;
  },
};

/** Default registration — the Phase 2 Postgres engine. Idempotent. */
export function ensureDefaultEngine(): void {
  if (current) return;
  current = {
    search: new PostgresFtsSearchStrategy(),
    ranking: new SqlRankingStrategy(),
    related: new HybridRecommendationStrategy(),
  };
}
