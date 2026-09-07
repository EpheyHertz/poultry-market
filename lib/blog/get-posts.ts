import { prisma } from '@/lib/prisma';
import { BLOG_PAGE_SIZE } from './listing-config';

export type BlogSortOption = 'latest' | 'oldest' | 'popular';

export interface GetPostsParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  tag?: string;
  featured?: boolean;
  authorId?: string;
  status?: 'PUBLISHED' | 'APPROVED' | 'DRAFT' | 'PENDING' | 'REJECTED';
  /** Ordering of the underlying feed. Defaults to `latest`. */
  sort?: BlogSortOption | string | null;
  /**
   * Interleave results so a single prolific author cannot monopolise a page.
   * Enabled by default for browse listings; automatically skipped when the
   * caller asks for one specific author or runs a text search.
   */
  diversifyAuthors?: boolean;
  /** Max posts from the same author inside each page-sized window. */
  maxPerAuthorPerPage?: number;
}

export interface BlogPostAuthor {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  _count?: {
    followers: number;
    blogPosts: number;
  };
}

/**
 * Shape returned to the client. Intentionally loose (`any` spread of the Prisma
 * record) so it stays in sync with `/api/blog/posts` without duplicating the
 * full generated BlogPost type.
 */
export type PostWithRelations = Record<string, any> & {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  images: string[];
  category: string;
  views: number;
  featured: boolean;
  readingTime: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  author: BlogPostAuthor;
  tags: Array<{ id: string; name: string; slug: string }>;
  authorUsername: string | null;
  authorDisplayName: string;
  commentCount: number;
  likeCount: number;
  _count: {
    comments: number;
    likes: number;
  };
};


export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface GetPostsResult {
  posts: PostWithRelations[];
  pagination: PaginationInfo;
}

/**
 * Safety valve: above this many matching posts we stop building the balanced
 * sequence in memory and fall back to plain database ordering.
 */
const DIVERSITY_MAX_CANDIDATES = 3000;

/** Balanced sequences are memoised briefly so paging doesn't rebuild them per request. */
const SEQUENCE_TTL_MS = 30_000;
const SEQUENCE_CACHE_MAX_ENTRIES = 50;

interface CandidateRow {
  id: string;
  authorId: string;
  publishedAt: Date | null;
  createdAt: Date;
  viewCount: number | null;
  views: number | null;
}

interface CachedSequence {
  expiresAt: number;
  ids: string[];
}

const sequenceCache = new Map<string, CachedSequence>();

function readSequenceCache(key: string): string[] | null {
  const hit = sequenceCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    sequenceCache.delete(key);
    return null;
  }
  return hit.ids;
}

function writeSequenceCache(key: string, ids: string[]): void {
  if (sequenceCache.size >= SEQUENCE_CACHE_MAX_ENTRIES) {
    const oldestKey = sequenceCache.keys().next().value;
    if (oldestKey !== undefined) sequenceCache.delete(oldestKey);
  }
  sequenceCache.set(key, { expiresAt: Date.now() + SEQUENCE_TTL_MS, ids });
}

function normalizeSort(sort: GetPostsParams['sort']): BlogSortOption {
  if (sort === 'oldest') return 'oldest';
  if (sort === 'popular' || sort === 'trending' || sort === 'views') return 'popular';
  return 'latest';
}

function effectiveTime(row: CandidateRow): number {
  return (row.publishedAt ?? row.createdAt).getTime();
}

function popularity(row: CandidateRow): number {
  return Math.max(row.viewCount ?? 0, row.views ?? 0);
}

/** Deterministic comparator — required so `?page=N` offsets stay stable. */
function compareCandidates(a: CandidateRow, b: CandidateRow, sort: BlogSortOption): number {
  if (sort === 'popular') {
    const byViews = popularity(b) - popularity(a);
    if (byViews !== 0) return byViews;
  }

  const byDate =
    sort === 'oldest'
      ? effectiveTime(a) - effectiveTime(b)
      : effectiveTime(b) - effectiveTime(a);
  if (byDate !== 0) return byDate;

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

interface AuthorBucket<T> {
  items: T[];
  /** Index of this author's next unplaced post. */
  cursor: number;
  /** How many of this author's posts are already in the window being built. */
  taken: number;
}

/**
 * Spreads authors across the feed without breaking offset pagination.
 *
 * Posts are bucketed per author (each bucket keeping the requested sort order),
 * then dealt out round-robin one page-sized window at a time: every author
 * contributes their freshest remaining post before anyone contributes a second.
 * `maxPerAuthorPerPage` is a soft ceiling that is only relaxed when there aren't
 * enough other authors left to fill the page.
 *
 * The output is always a complete, duplicate-free permutation of the input and
 * is fully deterministic, so `?page=N` offsets stay stable across requests.
 */
export function interleaveByAuthor<T extends { id: string; authorId: string }>(
  sorted: T[],
  windowSize: number,
  maxPerAuthorPerPage?: number
): T[] {
  if (windowSize < 1 || sorted.length <= 1) {
    return sorted;
  }

  const buckets = new Map<string, AuthorBucket<T>>();
  for (const item of sorted) {
    const bucket = buckets.get(item.authorId);
    if (bucket) {
      bucket.items.push(item);
    } else {
      buckets.set(item.authorId, { items: [item], cursor: 0, taken: 0 });
    }
  }

  // Single author -> nothing to balance.
  if (buckets.size < 2) {
    return sorted;
  }

  const globalRank = new Map<string, number>();
  sorted.forEach((item, index) => globalRank.set(item.id, index));

  const cap =
    maxPerAuthorPerPage && maxPerAuthorPerPage > 0 ? maxPerAuthorPerPage : windowSize;
  const allBuckets = Array.from(buckets.values());
  const result: T[] = [];

  while (result.length < sorted.length) {
    const live = allBuckets.filter((bucket) => bucket.cursor < bucket.items.length);
    if (live.length === 0) break;

    // Authors holding the freshest remaining post lead the page.
    live.sort(
      (a, b) =>
        (globalRank.get(a.items[a.cursor].id) ?? 0) -
        (globalRank.get(b.items[b.cursor].id) ?? 0)
    );
    live.forEach((bucket) => {
      bucket.taken = 0;
    });

    let filled = 0;
    let relaxed = false;

    while (filled < windowSize) {
      let progressed = false;

      // One pass = at most one post per author.
      for (const bucket of live) {
        if (filled >= windowSize) break;
        if (bucket.cursor >= bucket.items.length) continue;
        if (!relaxed && bucket.taken >= cap) continue;

        result.push(bucket.items[bucket.cursor]);
        bucket.cursor += 1;
        bucket.taken += 1;
        filled += 1;
        progressed = true;
      }

      if (progressed) continue;
      // Nothing placed: either the cap is holding the page short (relax it once)
      // or every author is exhausted (stop).
      if (relaxed) break;
      relaxed = true;
    }
  }

  return result;
}


export async function getBlogPosts(params: GetPostsParams = {}): Promise<GetPostsResult> {
  const {
    page = 1,
    limit = BLOG_PAGE_SIZE,
    category,
    search,
    tag,
    featured,
    authorId,
    status,
    sort,
    diversifyAuthors,
    maxPerAuthorPerPage,
  } = params;

  const sortOption = normalizeSort(sort);

  // Build where clause
  const where: any = {};

  if (category) {
    where.category = category;
  }

  if (status) {
    if (status === 'PUBLISHED') {
      where.status = { in: ['PUBLISHED', 'APPROVED'] };
    } else {
      where.status = status;
    }
  } else {
    // Default: only show published/approved posts
    where.status = { in: ['PUBLISHED', 'APPROVED'] };
  }

  if (featured !== undefined) {
    where.featured = featured;
  }

  if (authorId) {
    where.authorId = authorId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (tag) {
    where.tags = {
      some: {
        tag: {
          slug: tag,
        },
      },
    };
  }

  // Author balancing only makes sense when browsing a mixed feed.
  const shouldDiversify =
    diversifyAuthors !== false && !authorId && !search;

  const authorCap =
    maxPerAuthorPerPage && maxPerAuthorPerPage > 0
      ? maxPerAuthorPerPage
      : Math.max(2, Math.ceil(limit / 4));

  let orderedIds: string[] | null = null;
  let totalPosts: number;

  if (shouldDiversify) {
    const cacheKey = JSON.stringify({ where, limit, sortOption, authorCap });
    const cached = readSequenceCache(cacheKey);

    if (cached) {
      orderedIds = cached;
    } else {
      const candidates = (await prisma.blogPost.findMany({
        where,
        select: {
          id: true,
          authorId: true,
          publishedAt: true,
          createdAt: true,
          viewCount: true,
          views: true,
        },
        take: DIVERSITY_MAX_CANDIDATES + 1,
      })) as CandidateRow[];

      if (candidates.length <= DIVERSITY_MAX_CANDIDATES) {
        const sorted = [...candidates].sort((a, b) => compareCandidates(a, b, sortOption));
        orderedIds = interleaveByAuthor(sorted, limit, authorCap).map((row) => row.id);
        writeSequenceCache(cacheKey, orderedIds);
      }
    }
  }

  if (orderedIds) {
    totalPosts = orderedIds.length;
  } else {
    totalPosts = await prisma.blogPost.count({ where });
  }

  // Calculate pagination
  const totalPages = Math.ceil(totalPosts / limit);
  const skip = (page - 1) * limit;

  const pageIds = orderedIds ? orderedIds.slice(skip, skip + limit) : null;

  const queryArgs: Record<string, any> = pageIds
    ? { where: { id: { in: pageIds } } }
    : {
        where,
        orderBy: buildOrderBy(sortOption),
        skip,
        take: limit,

      };

  // Fetch posts with all relations
  const rows = pageIds && pageIds.length === 0
    ? []
    : await prisma.blogPost.findMany({
        ...queryArgs,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              _count: {
                select: {
                  followers: true,
                  blogPosts: true,
                },
              },
            },
          },
          authorProfile: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              bio: true,
              isVerified: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              comments: {
                where: {
                  isApproved: true,
                },
              },
              likedBy: true,
            },
          },
        },
      });

  // `WHERE id IN (...)` loses ordering, so restore the balanced sequence.
  let posts = rows as any[];
  if (pageIds && posts.length > 0) {
    const byId = new Map(posts.map((post) => [post.id, post]));
    posts = pageIds
      .map((id) => byId.get(id))
      .filter((post): post is any => Boolean(post));
  }

  // Map posts to match API response shape
  const mappedPosts: PostWithRelations[] = posts.map((post: any) => {
    const authorProfile = post.authorProfile;
    const author = post.author;

    return {
      ...post,
      author: {
        ...author,
        name: authorProfile?.displayName || author.name,
        displayName: authorProfile?.displayName || author.name,
        username: authorProfile?.username || null,
        avatar: authorProfile?.avatarUrl || author.avatar,
        avatarUrl: authorProfile?.avatarUrl || author.avatar,
        bio: authorProfile?.bio || null,
        isVerified: authorProfile?.isVerified || false,
        _count: author._count,
      },
      authorUsername: authorProfile?.username || null,
      authorDisplayName: authorProfile?.displayName || author.name,
      tags: post.tags.map((t: any) => t.tag),
      commentCount: post._count.comments,
      likeCount: post._count.likedBy,
      _count: {
        comments: post._count.comments,
        likes: post._count.likedBy,
      },
    };
  });

  return {
    posts: mappedPosts,
    pagination: {
      currentPage: page,
      totalPages,
      totalPosts,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Ordering for queries that skip author balancing (single author, text search,
 * or an oversized candidate set).
 *
 * `featured` is deliberately NOT a sort key here. It used to be the primary key,
 * which meant every featured post had to be paged past before any non-featured
 * post appeared — and with one author owning most of the featured flags, that
 * author filled the first pages. Featured posts already have their own carousel
 * on the blog home page.
 */
function buildOrderBy(sort: BlogSortOption): any[] {
  const orderBy: any[] = [];

  if (sort === 'popular') {

    orderBy.push({ viewCount: 'desc' });
  }

  if (sort === 'oldest') {
    orderBy.push({ publishedAt: 'asc' }, { createdAt: 'asc' });
  } else {
    orderBy.push({ publishedAt: 'desc' }, { createdAt: 'desc' });
  }

  return orderBy;
}
