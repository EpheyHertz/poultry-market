/**
 * PostgresFtsSearchStrategy — the Phase 2 Postgres implementation of the
 * SearchStrategy interface (§12.14). A future VectorSearchStrategy can be
 * registered alongside it without touching the public API.
 *
 * Runs the single-round-trip query produced by SearchQueryBuilder through
 * the shared PrismaClient (pg adapter), then maps rows to RankedCandidates.
 */

import { prisma } from '@/lib/prisma';
import { BoostRuleService } from '../BoostRuleService';
import { buildRecallTsQuery, buildSearchQuery } from '../SearchQueryBuilder';
import { normalizeWord } from '../SynonymService';
import type { RankedCandidate, SearchContext, SearchMode, SearchStrategyResult } from '../types';
import type { SearchStrategy } from './types';

/** Mode labels from the ladder CTE → public SearchMode. */
function mapMode(modeLabel: string): SearchMode {
  switch (modeLabel) {
    case 'browse':
      return 'browse';
    case 'recall':
      return 'recall';
    case 'trigram':
      return 'trigram';
    default: // web | plain | prefix
      return 'fts';
  }
}

interface RawRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  snippet: string | null;
  highlightedTitle: string | null;
  category: string;
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
  authorUsername: string | null;
  thumbnail: string | null;
  featuredImage: string | null;
  ftsRank: number;
  titleSim: number;
  tagSim: number;
  categorySim: number;
  authorSim: number;
  exactMatch: number;
  phraseInTitle: number;
  popularity: number;
  freshness: number;
  boostTotal: number;
  score: number;
  trending_score: string | number;
  totalResults: number;
  facet_categories: { name: string; count: number }[];
  facet_tags: { name: string; count: number }[];
  mode_label: string;
}

export class PostgresFtsSearchStrategy implements SearchStrategy {
  readonly id = 'postgres-fts';
  readonly description =
    'Hybrid PostgreSQL full-text + trigram search with synonym recall, ' +
    'configurable ranking, facets and keyset pagination in one round trip.';

  async search(ctx: SearchContext): Promise<SearchStrategyResult> {
    const { filters, config } = ctx;

    // Synonym expansion feeds ONLY the recall level (never the AND-precision
    // levels) — §12.2.
    let recallTerms: string[] = [];
    if (filters.q) {
      const tokens = filters.q
        .split(/\s+/)
        .map(normalizeWord)
        .filter(Boolean);
      const expanded = new Set<string>(tokens);
      for (const t of tokens) {
        const siblings = ctx.synonymMap.get(t);
        if (siblings) for (const s of siblings) expanded.add(s);
      }
      recallTerms = Array.from(expanded);
    }
    // buildRecallTsQuery guards emptiness; unused text is harmless anyway.
    void buildRecallTsQuery;

    const boostTotal = await BoostRuleService.getBoostForQuery(
      filters.normalizedQuery,
      config.thresholds.maxBoostTotal
    );

    const { sql, params } = buildSearchQuery(filters, {
      weights: config.weights,
      thresholds: config.thresholds,
      boostTotal,
      recallTerms,
    });

    const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as RawRow[];

    const diagnostics: Record<string, unknown> | undefined = ctx.debug
      ? {
          sql: sql.replace(/\s+/g, ' ').trim(),
          params,
          boostTotal,
          recallTerms,
        }
      : undefined;

    if (rows.length === 0) {
      return {
        candidates: [],
        total: 0,
        mode: filters.q ? 'trigram' : 'browse',
        facets: { categories: [], tags: [] },
        diagnostics,
      };
    }

    const mode = mapMode(rows[0].mode_label);
    const total = Number(rows[0].totalResults) || 0;

    const facets = {
      categories: Array.isArray(rows[0].facet_categories) ? rows[0].facet_categories : [],
      tags: Array.isArray(rows[0].facet_tags) ? rows[0].facet_tags : [],
    };

    const candidates: RankedCandidate[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      snippet: r.snippet,
      highlightedTitle: r.highlightedTitle ?? r.title,
      category: r.category,
      status: 'PUBLISHED', // filtered by the query (PUBLISHED/APPROVED only)
      featured: r.featured,
      publishedAt: r.publishedAt,
      readingTime: r.readingTime,
      views: Number(r.views) || 0,
      likes: Number(r.likes) || 0,
      shares: Number(r.shares) || 0,
      tags: Array.isArray(r.tags) ? r.tags : [],
      authorName: r.authorName,
      authorId: r.authorId,
      authorProfileId: r.authorProfileId,
      authorUsername: r.authorUsername,
      thumbnail: r.thumbnail,
      featuredImage: r.featuredImage,
      ftsRank: Number(r.ftsRank) || 0,
      titleSim: Number(r.titleSim) || 0,
      titleWordSim: Number(r.titleSim) || 0,
      tagSim: Number(r.tagSim) || 0,
      categorySim: Number(r.categorySim) || 0,
      authorSim: Number(r.authorSim) || 0,
      exactMatch: Number(r.exactMatch) > 0,
      phraseInTitle: Number(r.phraseInTitle) > 0,
      popularity: Number(r.popularity) || 0,
      freshness: Number(r.freshness) || 0,
      boostTotal: Number(r.boostTotal) || 0,
      matchedBy: mode,
      score: Number(r.score) || 0,
      trendingScore: Number(r.trending_score) || 0,
      total,
    }));

    return { candidates, total, mode, facets, diagnostics };
  }
}
