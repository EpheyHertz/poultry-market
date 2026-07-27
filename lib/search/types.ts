/**
 * Blog Search API — Type Definitions
 *
 * Shared types for keyword search, semantic search, and API responses.
 */

/** A single blog search result returned to external consumers. */
export interface BlogSearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  publishedAt: string | null;
  url: string;
}

/** A semantic search result with a relevance score. */
export interface SemanticSearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  url: string;
  /** Relevance score between 0 and 1. */
  score: number;
}

/** Parameters accepted by the keyword search service. */
export interface SearchBlogsParams {
  query: string;
  limit?: number;
}

/** Parameters accepted by the semantic search service. */
export interface SemanticSearchParams {
  query: string;
  limit?: number;
}

/** Standard error response shape. */
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

/** Standard success envelope for list responses. */
export interface SearchResponse {
  data: BlogSearchResult[];
  meta: {
    query: string;
    count: number;
    limit: number;
  };
}

/** Standard success envelope for semantic responses. */
export interface SemanticSearchResponse {
  data: SemanticSearchResult[];
  meta: {
    query: string;
    count: number;
    limit: number;
  };
}
