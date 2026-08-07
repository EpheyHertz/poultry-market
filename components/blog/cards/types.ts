// Shared types + helpers for the redesigned blog card system.
// One normalized post shape powers every card variant so we never
// duplicate layout logic across the page.

import { BLOG_CATEGORIES, type BlogCategory } from '@/types/blog';

export interface BlogCardAuthor {
  id: string;
  name: string;
  displayName?: string | null;
  username?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  _count?: { followers: number };
}

export interface BlogCardCategory {
  id: string;
  name: string;
  slug: string;
}

export interface BlogCardTag {
  id: string;
  name: string;
  slug: string;
}

/** Normalized post shape consumed by all card variants. */
export interface BlogCardPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  featuredImage?: string;
  publishedAt: Date | string | null;
  authorUsername?: string | null;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  authorIsVerified?: boolean;
  author: BlogCardAuthor;
  category?: BlogCardCategory;
  tags: BlogCardTag[];
  _count: { likes: number; comments: number };
  readingTime?: number;
  views?: number;
  /** search-mode extras */
  snippet?: string | null;
  highlightedTitle?: string | null;
}

/** Build the canonical post URL, preferring the author profile username. */
export function getPostUrl(post: Pick<BlogCardPost, 'slug' | 'authorUsername' | 'author'>): string {
  const authorPath =
    post.authorUsername ||
    post.author?.username ||
    post.author?.name?.replace(/\s+/g, '-').toLowerCase() ||
    'author';
  return `/blog/${authorPath}/${post.slug}`;
}

/** Human-friendly view/like counts: 1200 -> "1.2k". */
export function formatCompactNumber(value?: number | null): string {
  const n = value ?? 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
}

/** Resolve the best available author display name. */
export function getAuthorName(post: BlogCardPost): string {
  return (
    post.authorDisplayName ||
    post.author?.displayName ||
    post.author?.name ||
    'Unknown Author'
  );
}

/** Resolve the best available author avatar URL. */
export function getAuthorAvatar(post: BlogCardPost): string | undefined {
  return post.authorAvatarUrl || post.author?.avatarUrl || post.author?.avatar || undefined;
}

/** Category accent classes keyed off the enum, with a safe fallback. */
export function getCategoryColor(slug?: string): string {
  if (!slug) return BLOG_CATEGORIES.FARMING_TIPS.color;
  const key = slug.toUpperCase() as BlogCategory;
  return BLOG_CATEGORIES[key]?.color ?? 'bg-emerald-100 text-emerald-800';
}

/** Category icon emoji keyed off the enum. */
export function getCategoryIcon(slug?: string): string | undefined {
  if (!slug) return undefined;
  const key = slug.toUpperCase() as BlogCategory;
  return BLOG_CATEGORIES[key]?.icon;
}
