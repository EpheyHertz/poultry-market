/**
 * FilterService — validated parsing of every public search parameter (§5).
 *
 * - zod-validated; invalid input throws SearchValidationError (→ HTTP 400).
 * - `language` / `country` are DEFERRED (decision §13): the params are
 *   recognized but rejected with a clear message.
 * - Cursor pagination: keyset on (ordering column, id); cursors are
 *   opaque base64url blobs.
 * - All values become SQL *parameters* — never interpolated.
 */

import { z } from 'zod';
import { SearchValidationError } from './types';
import type { DecodedCursor, ParsedFilters, SortOption } from './types';

export const QUERY_MAX_LENGTH = 200;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;
export const MAX_TAG_FILTERS = 20;

export const BLOG_CATEGORIES = [
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
] as const;

const SORTS: SortOption[] = ['relevance', 'newest', 'oldest', 'trending', 'views', 'shares', 'alpha'];

/** Split a repeatable/comma-separated param into clean strings. */
function splitList(values: string[] | null): string[] | undefined {
  if (!values || values.length === 0) return undefined;
  const out: string[] = [];
  for (const v of values) {
    for (const part of v.split(',')) {
      const t = part.trim();
      if (t) out.push(t);
    }
  }
  return out.length > 0 ? out : undefined;
}

function parseBool(value: string | null): boolean | undefined {
  if (value === null || value === undefined) return undefined;
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
  throw new SearchValidationError(`Invalid boolean value: "${value}"`);
}

function parseDate(value: string | null, name: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new SearchValidationError(`Invalid ${name}: "${value}" — expected an ISO date`);
  }
  return d;
}

function parseBoundedInt(value: string | null, name: string, min: number, max: number): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new SearchValidationError(`Invalid ${name}: "${value}" — expected integer in [${min}, ${max}]`);
  }
  return n;
}

/** "5" → exact bucket; "5-10" → range. Returns [min, max]. */
function parseReadingTime(value: string | null): [number | undefined, number | undefined] {
  if (!value) return [undefined, undefined];
  const m = value.trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) {
    const min = Number(m[1]);
    const max = Number(m[2]);
    if (min > 600 || max > 600 || min > max) {
      throw new SearchValidationError(`Invalid readingTime range: "${value}"`);
    }
    return [min, max];
  }
  const exact = Number(value);
  if (!Number.isInteger(exact) || exact < 0 || exact > 600) {
    throw new SearchValidationError(`Invalid readingTime: "${value}" — expected "N" or "MIN-MAX"`);
  }
  return [exact, exact];
}

const cursorSchema = z.object({
  v: z.literal(1),
  s: z.number().optional(),
  d: z.string().optional(),
  n: z.number().optional(),
  t: z.string().optional(),
  i: z.string().min(1),
});

export function encodeCursor(cursor: DecodedCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf-8').toString('base64url');
}

export function decodeCursor(raw: string | null): DecodedCursor | undefined {
  if (!raw) return undefined;
  try {
    const json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8'));
    const parsed = cursorSchema.parse(json);
    return parsed as DecodedCursor;
  } catch {
    throw new SearchValidationError('Invalid or expired cursor');
  }
}

/** Normalize a user query: trim, collapse whitespace, enforce length cap. */
export function normalizeQuery(raw: string | null): { q?: string; normalizedQuery: string } {
  if (raw === null || raw === undefined) return { normalizedQuery: '' };
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length > QUERY_MAX_LENGTH) {
    throw new SearchValidationError(`Query too long (max ${QUERY_MAX_LENGTH} characters)`);
  }
  if (trimmed.length === 0) return { normalizedQuery: '' };
  return { q: trimmed, normalizedQuery: trimmed.toLowerCase() };
}

export const FilterService = {
  /**
   * Parse + validate raw URLSearchParams into ParsedFilters.
   * Throws SearchValidationError on any invalid input.
   */
  parse(params: URLSearchParams): ParsedFilters {
    // Deferred localization params (decision §13)
    for (const key of ['language', 'country'] as const) {
      if (params.get(key)) {
        throw new SearchValidationError(
          `The "${key}" filter is not supported yet — localization is planned in a later phase. Remove the parameter to continue.`
        );
      }
    }

    const { q, normalizedQuery } = normalizeQuery(params.get('q'));

    const limit = parseBoundedInt(params.get('limit'), 'limit', 1, MAX_LIMIT) ?? DEFAULT_LIMIT;
    const cursor = decodeCursor(params.get('cursor'));

    const categories = splitList(params.getAll('categories').length > 0 ? params.getAll('categories') : params.getAll('category'));
    if (categories) {
      for (const c of categories) {
        if (!(BLOG_CATEGORIES as readonly string[]).includes(c)) {
          throw new SearchValidationError(`Unknown category: "${c}"`);
        }
      }
    }

    const tags = splitList(params.getAll('tags').length > 0 ? params.getAll('tags') : params.getAll('tag'));
    if (tags && tags.length > MAX_TAG_FILTERS) {
      throw new SearchValidationError(`Too many tag filters (max ${MAX_TAG_FILTERS})`);
    }

    const authorRaw = params.get('author');
    const author = authorRaw?.trim() || undefined;
    if (author && author.length > 100) {
      throw new SearchValidationError('Author filter too long (max 100 characters)');
    }

    const featured = parseBool(params.get('featured'));

    const sortRaw = (params.get('sort') || 'relevance') as SortOption;
    if (!SORTS.includes(sortRaw)) {
      throw new SearchValidationError(`Invalid sort: "${sortRaw}" — expected one of ${SORTS.join(', ')}`);
    }

    const dateFrom = parseDate(params.get('dateFrom'), 'dateFrom');
    const dateTo = parseDate(params.get('dateTo'), 'dateTo');
    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      throw new SearchValidationError('dateFrom must be before dateTo');
    }

    const minViews = parseBoundedInt(params.get('minViews'), 'minViews', 0, 1_000_000_000);
    const maxViews = parseBoundedInt(params.get('maxViews'), 'maxViews', 0, 1_000_000_000);
    if (minViews !== undefined && maxViews !== undefined && minViews > maxViews) {
      throw new SearchValidationError('minViews must be ≤ maxViews');
    }
    const minLikes = parseBoundedInt(params.get('minLikes'), 'minLikes', 0, 1_000_000_000);
    const maxLikes = parseBoundedInt(params.get('maxLikes'), 'maxLikes', 0, 1_000_000_000);
    if (minLikes !== undefined && maxLikes !== undefined && minLikes > maxLikes) {
      throw new SearchValidationError('minLikes must be ≤ maxLikes');
    }

    const [readingTimeMin, readingTimeMax] = parseReadingTime(params.get('readingTime'));

    return {
      q,
      normalizedQuery,
      limit,
      cursor,
      categories,
      tags: tags?.map((t) => t.toLowerCase()),
      author,
      featured,
      readingTimeMin,
      readingTimeMax,
      dateFrom,
      dateTo,
      minViews,
      maxViews,
      minLikes,
      maxLikes,
      sort: sortRaw,
    };
  },

  /** Echo of applied filters for the response envelope. */
  describeApplied(f: ParsedFilters): Record<string, unknown> {
    const applied: Record<string, unknown> = {};
    if (f.q) applied.q = f.q;
    if (f.categories) applied.categories = f.categories;
    if (f.tags) applied.tags = f.tags;
    if (f.author) applied.author = f.author;
    if (f.featured !== undefined) applied.featured = f.featured;
    if (f.readingTimeMin !== undefined) applied.readingTimeMin = f.readingTimeMin;
    if (f.readingTimeMax !== undefined) applied.readingTimeMax = f.readingTimeMax;
    if (f.dateFrom) applied.dateFrom = f.dateFrom.toISOString();
    if (f.dateTo) applied.dateTo = f.dateTo.toISOString();
    if (f.minViews !== undefined) applied.minViews = f.minViews;
    if (f.maxViews !== undefined) applied.maxViews = f.maxViews;
    if (f.minLikes !== undefined) applied.minLikes = f.minLikes;
    if (f.maxLikes !== undefined) applied.maxLikes = f.maxLikes;
    applied.sort = f.sort;
    applied.limit = f.limit;
    return applied;
  },
};
