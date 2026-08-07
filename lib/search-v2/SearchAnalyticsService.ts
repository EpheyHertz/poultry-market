/**
 * SearchAnalyticsService — search_queries logging + click attribution
 * (§3.5, §12.7).
 *
 * Two responsibilities:
 *   1. logSearchQuery — fire-and-forget insert for every search (never
 *      blocks or fails a search response).
 *   2. recordClick — attributes a post click back to the search row
 *      (by queryId, or the most recent matching query) so CTR,
 *      did-you-mean conversion and related-article CTR can be computed.
 *
 * Retention: search_queries rows older than 90 days are purged by a cron
 * job — scheduled in Phase 8C (locked decision §13). Until then the table
 * simply grows; all reads here are index-backed.
 */

import { prisma } from '@/lib/prisma';
import { FilterService } from './FilterService';
import type { ParsedFilters } from './types';

export type ClickSource = 'results' | 'related' | 'didYouMean';

export interface ClickInput {
  /** Preferred — exact row from the search envelope's queryId. */
  queryId?: string;
  /** Fallback — resolves to the newest matching search row. */
  query?: string;
  postId: string;
  source: ClickSource;
  /** 0-based position within the results page. */
  position?: number;
  /** Milliseconds between render and click. */
  timeToClickMs?: number;
}

export const SearchAnalyticsService = {
  /**
   * Fire-and-forget insert for a completed search (§3.5). Must never
   * throw — analytics cannot break the search path.
   */
  logSearchQuery(opts: {
    queryId: string;
    filters: ParsedFilters;
    resultCount: number;
    responseMs: number;
    didYouMeanShown: boolean;
    autocompleteUsed?: boolean;
  }): void {
    const {
      queryId,
      filters,
      resultCount,
      responseMs,
      didYouMeanShown,
      autocompleteUsed,
    } = opts;
    prisma.searchQuery
      .create({
        data: {
          id: queryId,
          query: filters.q ?? '',
          normalized: filters.normalizedQuery,
          filtersJson: FilterService.describeApplied(filters) as object,
          sort: filters.sort,
          resultCount,
          noResults: resultCount === 0,
          responseMs: Math.round(responseMs),
          didYouMeanShown,
          autocompleteUsed: autocompleteUsed ?? false,
          source: 'results',
        },
      })
      .catch((err) => {
        console.error('[search-v2] analytics insert failed:', err);
      });
  },

  /**
   * Attribute a click to a search row. Returns true when a row was
   * matched (missing/unknown queryId → false; never throws).
   *
   * Field mapping per source (§12.7):
   *   results     → clicked_post_id, clicked_position, time_to_click_ms
   *   related     → opened_related_id
   *   didYouMean  → did_you_mean_used (+ clicked_post_id for attribution)
   */
  async recordClick(input: ClickInput): Promise<boolean> {
    try {
      // 1. Resolve the target row.
      let target: { id: string } | null = null;
      if (input.queryId) {
        target = await prisma.searchQuery.findUnique({
          where: { id: input.queryId },
          select: { id: true },
        });
      } else if (input.query) {
        const normalized = input.query.trim().replace(/\s+/g, ' ').toLowerCase();
        target = await prisma.searchQuery.findFirst({
          where: { normalized, source: 'results' },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
      }

      if (!target) return false;

      // 2. Apply source-specific fields.
      const data: Record<string, unknown> = {};
      switch (input.source) {
        case 'related':
          data.openedRelatedId = input.postId;
          break;
        case 'didYouMean':
          data.didYouMeanUsed = true;
          data.clickedPostId = input.postId;
          break;
        case 'results':
        default:
          data.clickedPostId = input.postId;
          break;
      }
      if (typeof input.position === 'number' && input.source === 'results') {
        data.clickedPosition = input.position;
      }
      if (typeof input.timeToClickMs === 'number') {
        data.timeToClickMs = input.timeToClickMs;
      }

      await prisma.searchQuery.update({ where: { id: target.id }, data });
      return true;
    } catch (err) {
      // Analytics must never surface errors to callers.
      console.error('[search-v2] click attribution failed:', err);
      return false;
    }
  },
};
