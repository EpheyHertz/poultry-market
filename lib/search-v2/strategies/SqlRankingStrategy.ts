/**
 * SqlRankingStrategy — RankingStrategy implementation that ranks in SQL.
 *
 * The actual scoring happens inside the search query (RankingService builds
 * the score expression consumed by SearchQueryBuilder), so rank() here is a
 * pass-through that preserves SQL order. It exists so the strategy surface
 * stays uniform — an in-memory or vector-based ranker can be swapped in.
 */

import type { RankedCandidate } from '../types';
import type { RankingStrategy, ScoredResult } from './types';
import type { RankingWeights } from '../types';

export class SqlRankingStrategy implements RankingStrategy {
  readonly id = 'sql-ranking';
  readonly description =
    'Scores are computed inside the single search SQL statement ' +
    '(§4 formula, search_configuration weights); this pass-through preserves order.';

  rank(candidates: RankedCandidate[], _weights: RankingWeights): ScoredResult[] {
    return candidates.map((candidate) => ({ candidate, score: candidate.score }));
  }
}
