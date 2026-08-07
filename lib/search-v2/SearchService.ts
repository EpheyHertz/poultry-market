/**
 * SearchService — the v2 search orchestrator.
 *
 * Pipeline per request:
 *   FilterService.parse  →  ConfigService + SynonymService (context)
 *   → engine.search (single-round-trip SQL) → engine.ranking
 *   → keyset cursor + envelope assembly → async analytics insert.
 *
 * didYouMean runs only for weak queries (zero hits or trigram fallback)
 * so correct queries never pay for it. suggestions live in the dedicated
 * GET /api/blog/search/suggest endpoint (§6).
 */

import { randomUUID } from 'crypto';
import { ConfigService } from './ConfigService';
import { DidYouMeanService } from './DidYouMeanService';
import { encodeCursor, FilterService } from './FilterService';
import { EngineRegistry } from './registry';
import { SearchAnalyticsService } from './SearchAnalyticsService';
import { SynonymService } from './SynonymService';
import type {
  DecodedCursor,
  ParsedFilters,
  RankedCandidate,
  SearchContext,
  SearchEnvelope,
  SearchResultItem,
} from './types';

/** Format a Date as a timezone-less timestamp literal matching storage. */
function toTimestampLiteral(d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.` +
    `${pad(d.getUTCMilliseconds(), 3)}`
  );
}

/** Build the keyset cursor from the last returned candidate. */
function buildNextCursor(sort: ParsedFilters['sort'], last: RankedCandidate): string {
  const cursor: DecodedCursor = {
    v: 1,
    i: last.id,
    d: last.publishedAt ? toTimestampLiteral(last.publishedAt) : undefined,
  };
  switch (sort) {
    case 'relevance':
      cursor.s = last.score;
      break;
    case 'newest':
    case 'oldest':
      break; // d + i only
    case 'trending':
      cursor.n = last.trendingScore ?? 0;
      break;
    case 'views':
      cursor.n = last.views;
      break;
    case 'shares':
      cursor.n = last.shares;
      break;
    case 'alpha':
      cursor.t = last.title.toLowerCase();
      break;
  }
  return encodeCursor(cursor);
}

function toItem(c: RankedCandidate): SearchResultItem {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    excerpt: c.excerpt,
    snippet: c.snippet,
    highlightedTitle: c.highlightedTitle,
    category: c.category,
    tags: c.tags,
    author: c.authorName,
    authorId: c.authorId,
    authorProfileId: c.authorProfileId,
    authorUsername: c.authorUsername,
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    readingTime: c.readingTime,
    views: c.views,
    likes: c.likes,
    featured: c.featured,
    thumbnail: c.thumbnail,
    featuredImage: c.featuredImage,
    score: Number(c.score.toFixed(4)),
  };
}

/**
 * Weak query = zero hits OR the engine had to fall back to trigram recall
 * (exact-phrase FTS found nothing). Those are the cases where the user
 * likely misspelled something; correct queries resolve via FTS and never
 * pay for a correction lookup.
 */
function isWeakQuery(result: { total: number; mode: string }): boolean {
  return result.total === 0 || result.mode === 'trigram';
}

export const SearchService = {
  /**
   * Execute a search and return the full response envelope (§8).
   * Throws SearchValidationError on invalid input (→ HTTP 400).
   */
  async search(params: URLSearchParams, debug = false): Promise<SearchEnvelope> {
    const startedAt = Date.now();

    const filters = FilterService.parse(params);

    const [config, synonymMap] = await Promise.all([
      ConfigService.getConfig(),
      SynonymService.getMap(),
    ]);

    const ctx: SearchContext = { filters, config, synonymMap, debug, startedAt };

    const engine = EngineRegistry.get();
    const result = await engine.search.search(ctx);

    // Ranking is performed in SQL; the strategy pass-through keeps order.
    const ranked = engine.ranking.rank(result.candidates, config.weights);

    const hasMore = result.candidates.length > filters.limit;
    const pageResults = hasMore ? ranked.slice(0, filters.limit) : ranked;
    const results = pageResults.map((r) => toItem(r.candidate));

    const nextCursor =
      hasMore && pageResults.length > 0
        ? buildNextCursor(filters.sort, pageResults[pageResults.length - 1].candidate)
        : null;

    // DidYouMean (§6) — only for weak queries; corrections come from
    // results-backed sources so they always lead to actual hits.
    let didYouMean = '';
    if (filters.q && isWeakQuery(result)) {
      try {
        didYouMean = (await DidYouMeanService.suggest(filters.q)) ?? '';
      } catch (err) {
        // Corrections are a nice-to-have; never break the search.
        console.error('[search-v2] didYouMean failed:', err);
      }
    }

    const searchTimeMs = Date.now() - startedAt;
    const queryId = randomUUID();

    SearchAnalyticsService.logSearchQuery({
      queryId,
      filters,
      resultCount: result.total,
      responseMs: searchTimeMs,
      didYouMeanShown: didYouMean !== '',
    });

    const envelope: SearchEnvelope = {
      results,
      filters: {
        applied: FilterService.describeApplied(filters),
        facets: result.facets ?? { categories: [], tags: [] },
      },
      suggestions: [], // served by GET /api/blog/search/suggest (§6)
      didYouMean,
      relatedSearches: [], // Phase 4
      nextCursor,
      totalResults: result.total,
      searchTimeMs,
      queryId,
      mode: result.mode,
    };

    if (debug && result.diagnostics) {
      envelope.debug = result.diagnostics;
    }

    return envelope;
  },
};
