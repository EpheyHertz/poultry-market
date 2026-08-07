/**
 * Phase 3/4 envelope additions — suggestions (§6) and related posts (§7).
 * The envelope types live here so routes stay thin and the strategy seam
 * (§12.14) is the only place engine implementations plug in.
 */

import type { RelatedCandidate } from './strategies/types';

/** Public related-post item (§8 contract). */
export interface RelatedPostItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  publishedAt: string | null;
  thumbnail: string | null;
  featuredImage: string | null;
  readingTime: number | null;
  views: number;
  likes: number;
  author: string | null;
  /** author_profiles.username — used to build /blog/{author}/{slug} links */
  authorUsername: string | null;
  relationshipScore: number;
  reasons: string[];
}

export interface RelatedEnvelope {
  relatedPosts: RelatedPostItem[];
  /** engine that produced the response (§12.14 explainability) */
  engine: string;
  relatedTimeMs: number;
}

export type { RelatedCandidate };
