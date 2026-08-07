/**
 * search-v2 shared types
 *
 * The v2 engine is strategy-driven (§12.14): the public API never changes,
 * only the strategy implementations behind it. All SQL lives in the
 * strategy/query-builder modules — routes stay thin.
 */

export type SearchMode = 'browse' | 'fts' | 'recall' | 'trigram';

export type SortOption =
  | 'relevance'
  | 'newest'
  | 'oldest'
  | 'trending'
  | 'views'
  | 'shares'
  | 'alpha';

/** Ranking weights — runtime values from search_configuration (§12.3). */
export interface RankingWeights {
  ftsWeight: number;
  titleWeight: number;
  tagWeight: number;
  categoryWeight: number;
  excerptWeight: number;
  contentWeight: number;
  authorWeight: number;
  freshnessWeight: number;
  popularityWeight: number;
  trigramWeight: number;
  phraseWeight: number;
  exactMatchWeight: number;
  featuredWeight: number;
  manualBoostWeight: number;
}

export interface SearchThresholds {
  trigramSimThreshold: number;
  fuzzyMatchThreshold: number;
  relatedMinScore: number;
  candidateLimit: number;
  maxBoostTotal: number;
}

export interface CacheTtls {
  searchSec: number;
  autocompleteSec: number;
  relatedSec: number;
  suggestionsSec: number;
}

export interface SearchConfig {
  weights: RankingWeights;
  thresholds: SearchThresholds;
  ttls: CacheTtls;
  /** Raw key→value map for anything without a typed accessor. */
  raw: Map<string, number>;
  loadedAt: number;
}

/** Validated filter/sort/pagination state produced by FilterService. */
export interface ParsedFilters {
  q?: string;
  normalizedQuery: string;
  limit: number;
  cursor?: DecodedCursor;
  categories?: string[];
  tags?: string[];
  author?: string;
  featured?: boolean;
  trending?: boolean;
  popular?: boolean;
  readingTimeMin?: number;
  readingTimeMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  minViews?: number;
  maxViews?: number;
  minLikes?: number;
  maxLikes?: number;
  sort: SortOption;
}

export interface DecodedCursor {
  v: 1;
  /** score (relevance / trending sorts) */
  s?: number;
  /** ISO date (newest / oldest sorts) */
  d?: string;
  /** numeric (views / shares sorts) */
  n?: number;
  /** title (alpha sort) */
  t?: string;
  /** tie-break id, always present */
  i: string;
}

/** Everything a strategy needs to run a search. */
export interface SearchContext {
  filters: ParsedFilters;
  config: SearchConfig;
  /** word → expanded synonym words (DB-driven, §12.2) */
  synonymMap: Map<string, string[]>;
  debug: boolean;
  startedAt: number;
}

/** A candidate row with every sub-score exposed for ranking + explainability. */
export interface RankedCandidate {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  snippet: string | null;
  highlightedTitle: string;
  category: string;
  status: string;
  featured: boolean;
  publishedAt: Date | null;
  readingTime: number | null;
  views: number;
  likes: number;
  shares: number;
  tags: string[];
  authorName: string | null;
  authorId: string;
  authorProfileId: string | null;
  /** author_profiles.username — used to build /blog/{author}/{slug} links */
  authorUsername: string | null;
  thumbnail: string | null;
  featuredImage: string | null;
  // sub-scores (for explainability §12.13)
  ftsRank: number;
  titleSim: number;
  titleWordSim: number;
  tagSim: number;
  categorySim: number;
  authorSim: number;
  exactMatch: boolean;
  phraseInTitle: boolean;
  popularity: number;
  freshness: number;
  boostTotal: number;
  matchedBy: SearchMode;
  score: number;
  /** trending sort value (7-day views + likes blend) — for keyset cursors */
  trendingScore?: number;
  total: number;
}

export interface FacetBucket {
  name: string;
  count: number;
}

export interface SearchFacets {
  categories: FacetBucket[];
  tags: FacetBucket[];
}

/** Typeahead / autocomplete suggestion (§6, §8 /suggest contract). */
export type SuggestionType =
  | 'title'
  | 'tag'
  | 'category'
  | 'author'
  | 'popular'
  | 'trending'
  | 'recent';

export interface SearchSuggestion {
  text: string;
  type: SuggestionType;
  /** post count or search count — omitted when not meaningful (titles) */
  count?: number;
}

export interface SuggestEnvelope {
  suggestions: SearchSuggestion[];
}

export interface SearchStrategyResult {
  candidates: RankedCandidate[];
  total: number;
  mode: SearchMode;
  /** facet counts computed over the filtered set in the same round trip */
  facets?: SearchFacets;
  /** only populated when ctx.debug is true (§12.13) */
  diagnostics?: Record<string, unknown>;
}

/** Public result item (envelope shape, §8). */
export interface SearchResultItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  snippet: string | null;
  highlightedTitle: string;
  category: string;
  tags: string[];
  author: string | null;
  authorId: string;
  authorProfileId: string | null;
  /** author_profiles.username — used to build /blog/{author}/{slug} links */
  authorUsername: string | null;
  publishedAt: string | null;
  readingTime: number | null;
  views: number;
  likes: number;
  featured: boolean;
  thumbnail: string | null;
  featuredImage: string | null;
  score: number;
}

export interface SearchEnvelope {
  results: SearchResultItem[];
  filters: {
    applied: Record<string, unknown>;
    facets: SearchFacets;
  };
  suggestions: unknown[];
  didYouMean: string;
  relatedSearches: unknown[];
  nextCursor: string | null;
  totalResults: number;
  searchTimeMs: number;
  /** id of the logged search_queries row — used by POST /click */
  queryId?: string;
  mode?: SearchMode;
  debug?: Record<string, unknown>;
}

/** Error with an HTTP status, thrown by validation layers. */
export class SearchValidationError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = 'SearchValidationError';
  }
}
