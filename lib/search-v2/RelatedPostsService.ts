/**
 * RelatedPostsService — Phase 4 (§7).
 *
 * Public entry point for related-post recommendations. Resolves the post by
 * slug, delegates to the registered RecommendationStrategy (§12.14 — today
 * the HybridRecommendationStrategy, swappable later), maps candidates to the
 * public envelope shape (§8) and caches per `slug:limit` for
 * `ttls.relatedSec` (default 600 s, §7).
 *
 * Errors surface as SearchValidationError with an HTTP status so the route
 * can map them 1:1 (404 unknown/non-public post, 400 bad limit).
 */

import { prisma } from '@/lib/prisma';
import { ConfigService } from './ConfigService';
import { EngineRegistry } from './registry';
import type { RelatedEnvelope, RelatedPostItem } from './relatedTypes';
import { SearchValidationError } from './types';
import { PUBLIC_STATUSES } from './sql';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;
const CACHE_MAX_ENTRIES = 500;

interface CacheEntry {
  envelope: RelatedEnvelope;
  storedAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Statuses a post must have to serve (or anchor) related recommendations. */
const PUBLIC_STATUS_SET = new Set(
  PUBLIC_STATUSES.replace(/[()']/g, '').split(',')
);

function toKey(slug: string, limit: number): string {
  return `${slug}::${limit}`;
}

function pruneCache(): void {
  if (cache.size <= CACHE_MAX_ENTRIES) return;
  // Map preserves insertion order — drop oldest entries first.
  for (const key of cache.keys()) {
    cache.delete(key);
    if (cache.size <= CACHE_MAX_ENTRIES) break;
  }
}

function toItem(c: {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  publishedAt: Date | null;
  thumbnail: string | null;
  relationshipScore: number;
  reasons: string[];
  featuredImage?: string | null;
  readingTime?: number | null;
  views?: number;
  likes?: number;
  authorName?: string | null;
  authorUsername?: string | null;
}): RelatedPostItem {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    excerpt: c.excerpt,
    category: c.category,
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    thumbnail: c.thumbnail,
    featuredImage: c.featuredImage ?? null,
    readingTime: c.readingTime ?? null,
    views: c.views ?? 0,
    likes: c.likes ?? 0,
    author: c.authorName ?? null,
    authorUsername: c.authorUsername ?? null,
    relationshipScore: c.relationshipScore,
    reasons: c.reasons,
  };
}

export const RelatedPostsService = {
  /**
   * Find related posts for the post at `slug`.
   * Cached for ttls.relatedSec (10 min default). Throws
   * SearchValidationError(404) when the post is unknown or not public.
   */
  async findRelated(slug: string, limit?: number): Promise<RelatedEnvelope> {
    if (!slug || typeof slug !== 'string' || slug.length > 200) {
      throw new SearchValidationError('Post slug is required', 400);
    }

    const effectiveLimit = normalizeLimit(limit);
    const config = await ConfigService.getConfig();
    const key = toKey(slug, effectiveLimit);

    const ttlMs = Math.max(1, config.ttls.relatedSec) * 1000;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.storedAt < ttlMs) {
      return hit.envelope;
    }

    const startedAt = Date.now();

    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true, slug: true, status: true },
    });

    if (!post || !PUBLIC_STATUS_SET.has(post.status)) {
      throw new SearchValidationError('Post not found', 404);
    }

    const engine = EngineRegistry.get();
    const candidates = await engine.related.related(
      { id: post.id, slug: post.slug },
      effectiveLimit
    );

    const envelope: RelatedEnvelope = {
      relatedPosts: candidates.map(toItem),
      engine: engine.related.id,
      relatedTimeMs: Date.now() - startedAt,
    };

    pruneCache();
    cache.set(key, { envelope, storedAt: Date.now() });
    return envelope;
  },

  /** Drop cached related results — hook for post publish/unpublish events. */
  invalidate(slug?: string): void {
    if (!slug) {
      cache.clear();
      return;
    }
    for (const key of cache.keys()) {
      if (key.startsWith(`${slug}::`)) cache.delete(key);
    }
  },
};

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isFinite(limit) || !Number.isInteger(limit)) {
    throw new SearchValidationError('"limit" must be an integer');
  }
  if (limit < 1 || limit > MAX_LIMIT) {
    throw new SearchValidationError(`"limit" must be between 1 and ${MAX_LIMIT}`);
  }
  return limit;
}
