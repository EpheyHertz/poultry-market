/**
 * SearchService — Blog Search & Semantic Search
 *
 * Clean-architecture service layer for blog search operations.
 * All search logic lives here; route handlers only orchestrate.
 *
 * Future: swap the internal ranking in `semanticSearch()` with
 * pgvector / Pinecone by replacing the scoring function only.
 */

import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/seo';
import type {
  BlogSearchResult,
  SearchBlogsParams,
  SemanticSearchParams,
  SemanticSearchResult,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

/** Weights used for semantic relevance scoring. */
const SCORE_WEIGHTS = {
  title: 0.35,
  tags: 0.25,
  category: 0.15,
  excerpt: 0.15,
  content: 0.10,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampLimit(limit?: number): number {
  if (limit === undefined || limit === null) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
}

/** Build the public-facing URL for a blog post. */
function buildPostUrl(
  slug: string,
  authorUsername: string | null,
  authorName: string | null,
): string {
  const authorPath =
    authorUsername ||
    (authorName ? authorName.replace(/\s+/g, '-').toLowerCase() : 'author');
  return `${SITE_URL}/blog/${authorPath}/${slug}`;
}

/** Tokenise a query string into lowercase terms. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Compute a relevance score (0–1) for a post against query terms.
 *
 * This is a lightweight TF-based scorer designed to be replaced later
 * by a vector-similarity score from pgvector or Pinecone.
 */
function computeRelevanceScore(
  terms: string[],
  fields: {
    title: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string[];
  },
): number {
  if (terms.length === 0) return 0;

  const titleLower = fields.title.toLowerCase();
  const excerptLower = (fields.excerpt || '').toLowerCase();
  const contentLower = fields.content.toLowerCase();
  const categoryLower = fields.category.toLowerCase().replace(/_/g, ' ');
  const tagsJoined = fields.tags.join(' ').toLowerCase();

  let score = 0;

  for (const term of terms) {
    // Title
    if (titleLower.includes(term)) score += SCORE_WEIGHTS.title;
    // Tags
    if (tagsJoined.includes(term)) score += SCORE_WEIGHTS.tags;
    // Category
    if (categoryLower.includes(term)) score += SCORE_WEIGHTS.category;
    // Excerpt
    if (excerptLower.includes(term)) score += SCORE_WEIGHTS.excerpt;
    // Content
    if (contentLower.includes(term)) score += SCORE_WEIGHTS.content;
  }

  // Normalise to 0–1 range
  const maxPossible = terms.length * (
    SCORE_WEIGHTS.title +
    SCORE_WEIGHTS.tags +
    SCORE_WEIGHTS.category +
    SCORE_WEIGHTS.excerpt +
    SCORE_WEIGHTS.content
  );

  return maxPossible > 0 ? Math.min(1, score / maxPossible) : 0;
}

// ---------------------------------------------------------------------------
// Prisma select shapes (only fields the AI needs)
// ---------------------------------------------------------------------------

const searchSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  category: true,
  publishedAt: true,
  authorProfile: { select: { username: true } },
  author: { select: { name: true } },
  tags: { select: { tag: { select: { name: true } } } },
} as const;

const semanticSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  category: true,
  authorProfile: { select: { username: true } },
  author: { select: { name: true } },
  tags: { select: { tag: { select: { name: true } } } },
} as const;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SearchService {
  /**
   * Keyword search across published blogs.
   *
   * Searches title, excerpt, tags, and content using case-insensitive
   * `contains`. Category is matched when the query matches a category name.
   *
   * Never returns draft / unpublished articles.
   */
  async searchBlogs(params: SearchBlogsParams): Promise<BlogSearchResult[]> {
    const limit = clampLimit(params.limit);
    const query = params.query.trim();

    // Build OR conditions for text fields
    const orConditions: Record<string, unknown>[] = [
      { title: { contains: query, mode: 'insensitive' } },
      { excerpt: { contains: query, mode: 'insensitive' } },
      { content: { contains: query, mode: 'insensitive' } },
      {
        tags: {
          some: {
            tag: { name: { contains: query, mode: 'insensitive' } },
          },
        },
      },
    ];

    // If the query matches a known category enum value, include it
    const categoryMatch = this.matchCategory(query);
    if (categoryMatch) {
      orConditions.push({ category: categoryMatch });
    }

    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        OR: orConditions,
      },
      select: searchSelect,
      take: limit,
      orderBy: { publishedAt: 'desc' },
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags.map((t) => t.tag.name),
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      url: buildPostUrl(
        post.slug,
        post.authorProfile?.username ?? null,
        post.author?.name ?? null,
      ),
    }));
  }

  /**
   * Semantic search for AI agents.
   *
   * Currently uses a lightweight term-frequency scorer across title,
   * tags, category, excerpt, and content. Designed so the scoring
   * function can be swapped for pgvector / Pinecone later without
   * changing the public interface.
   */
  async semanticSearch(
    params: SemanticSearchParams,
  ): Promise<SemanticSearchResult[]> {
    const limit = clampLimit(params.limit);
    const terms = tokenize(params.query);

    // Fetch a broader candidate set, then rank in-memory.
    // A production vector search would push this filtering to the DB.
    const candidates = await prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: semanticSelect,
      take: 100,
      orderBy: { publishedAt: 'desc' },
    });

    const scored = candidates
      .map((post) => {
        const score = computeRelevanceScore(terms, {
          title: post.title,
          excerpt: post.excerpt || '',
          content: post.content,
          category: post.category,
          tags: post.tags.map((t) => t.tag.name),
        });

        return {
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          url: buildPostUrl(
            post.slug,
            post.authorProfile?.username ?? null,
            post.author?.name ?? null,
          ),
          score: Math.round(score * 1000) / 1000, // 3 decimal places
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  /**
   * Attempt to match a raw query string to a BlogPostCategory enum value.
   * Returns the enum string or null.
   */
  private matchCategory(query: string): string | null {
    const categories = [
      'FARMING_TIPS',
      'POULTRY_HEALTH',
      'FEED_NUTRITION',
      'EQUIPMENT_GUIDES',
      'MARKET_TRENDS',
      'SUCCESS_STORIES',
      'INDUSTRY_NEWS',
      'SEASONAL_ADVICE',
      'BEGINNER_GUIDES',
      'ADVANCED_TECHNIQUES',
    ];

    const normalised = query.toUpperCase().replace(/[\s-]+/g, '_');
    const found = categories.find(
      (c) => c === normalised || c.replace(/_/g, ' ').includes(query.toLowerCase()),
    );
    return found ?? null;
  }
}

/** Singleton instance for reuse across route handlers. */
export const searchService = new SearchService();
