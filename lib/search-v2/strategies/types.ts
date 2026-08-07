/**
 * Strategy interfaces (§12.14) — the stable seams of the search engine.
 *
 * Today these are implemented by Postgres-native strategies. A future
 * pgvector/semantic implementation plugs in by implementing the same
 * interfaces and registering itself in `registry.ts` — no route or
 * frontend changes required. Vector search is deliberately NOT implemented
 * now; only the seams exist.
 */

import type {
  RankedCandidate,
  RankingWeights,
  SearchContext,
  SearchStrategyResult,
} from '../types';

export interface SearchStrategy {
  readonly id: string;
  readonly description: string;
  search(ctx: SearchContext): Promise<SearchStrategyResult>;
}

export interface ScoredResult {
  candidate: RankedCandidate;
  score: number;
}

export interface RankingStrategy {
  readonly id: string;
  readonly description: string;
  /**
   * Final ordering pass. The Postgres implementation receives candidates
   * already scored in SQL (one round trip); this seam exists so a future
   * strategy can re-rank client-side (e.g. ML or vector blend) without
   * touching callers.
   */
  rank(candidates: RankedCandidate[], weights: RankingWeights): ScoredResult[];
}

export interface PostRef {
  id: string;
  slug: string;
}

export interface RelatedCandidate {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  publishedAt: Date | null;
  thumbnail: string | null;
  relationshipScore: number;
  reasons: string[];
  /** Optional display fields — implementations fill what they can (§8). */
  featuredImage?: string | null;
  readingTime?: number | null;
  views?: number;
  likes?: number;
  authorName?: string | null;
  /** author_profiles.username — used to build /blog/{author}/{slug} links */
  authorUsername?: string | null;
}

export interface RecommendationStrategy {
  readonly id: string;
  readonly description: string;
  related(post: PostRef, limit: number): Promise<RelatedCandidate[]>;
}
