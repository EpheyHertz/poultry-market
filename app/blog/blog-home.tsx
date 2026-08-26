'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BLOG_CATEGORIES, type BlogCategory } from '@/types/blog';
import { trackSearchClick } from '@/lib/search-v2/trackClick';
import SearchAutocomplete, { SearchAutocompleteHandle, Suggestion } from '@/components/blog/search-autocomplete';
import { GridCard, type BlogCardPost } from '@/components/blog/cards';
import { GridCardSkeleton } from '@/components/blog/skeletons';
import {
  SectionHeader,
  FilterChips,
  type FilterChip,
  TrendingSidebar,
  NewsletterCTA,
  EmptyState,
} from '@/components/blog/sections';
import { FeaturedCarousel } from '@/components/blog/featured-carousel';
import AdSlot from '@/components/ads/ad-slot';
import { BlogPagination } from '@/components/blog/pagination';
import { BLOG_PAGE_SIZE, FEATURED_LIMIT } from '@/lib/blog/listing-config';

/**
 * Posts per page for "All Articles". Shared with the server component so the
 * SSR-seeded page and client-fetched pages use identical offsets.
 */
const PAGE_SIZE = BLOG_PAGE_SIZE;


/** Every value is a real BLOG_CATEGORIES key so the API filter actually matches. */
const FILTER_CHIPS: FilterChip[] = [
  { label: 'All', value: '', icon: '📚' },
  ...(Object.keys(BLOG_CATEGORIES) as BlogCategory[]).map((key) => ({
    label: BLOG_CATEGORIES[key].name,
    value: key,
    icon: BLOG_CATEGORIES[key].icon,
  })),
];

// ────────────────────────────────────────────────────────────────────────────────
// NORMALIZERS
//
// The two data sources disagree on shape, and the cards only understand one of
// them. `/api/blog/posts` returns `category` as a bare enum string and view
// counts as `viewCount`; the v2 search endpoint returns a flatter result row.
// Both are normalized to BlogCardPost here so every card variant renders the
// same regardless of which mode fetched the post.
// ────────────────────────────────────────────────────────────────────────────────

function toCategory(value: unknown): BlogCardPost['category'] {
  if (!value || typeof value !== 'string') return undefined;
  const meta = BLOG_CATEGORIES[value as BlogCategory];
  return { id: value, name: meta?.name || value, slug: value };
}

/** Shape returned by GET /api/blog/posts (browse mode). */
interface ApiPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  category?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  readingTime?: number | null;
  viewCount?: number | null;
  views?: number | null;
  authorUsername?: string | null;
  authorDisplayName?: string | null;
  author: {
    id: string;
    name: string;
    displayName?: string | null;
    username?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
    _count?: { followers: number };
  };
  tags?: Array<{ id: string; name: string; slug: string }>;
  _count?: { likes?: number; comments?: number };
}

function normalizeApiPost(post: ApiPost): BlogCardPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || '',
    featuredImage: post.featuredImage || undefined,
    publishedAt: post.publishedAt || post.createdAt || null,
    authorUsername: post.authorUsername ?? post.author?.username ?? null,
    authorDisplayName: post.authorDisplayName ?? post.author?.displayName ?? null,
    authorAvatarUrl: post.author?.avatarUrl || post.author?.avatar || null,
    authorIsVerified: post.author?.isVerified ?? false,
    author: post.author,
    category: toCategory(post.category),
    tags: post.tags || [],
    _count: {
      likes: post._count?.likes ?? 0,
      comments: post._count?.comments ?? 0,
    },
    readingTime: post.readingTime ?? undefined,
    views: post.viewCount ?? post.views ?? 0,
  };
}

/** Shape returned by GET /api/blog/search (v2 search mode). */
interface V2ResultItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  snippet: string | null;
  highlightedTitle: string | null;
  category: string;
  tags: string[];
  author: string | null;
  authorId: string;
  authorUsername: string | null;
  publishedAt: string | null;
  readingTime: number | null;
  views: number;
  likes: number;
  thumbnail: string | null;
  featuredImage: string | null;
}

function normalizeSearchResult(item: V2ResultItem): BlogCardPost {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt || '',
    featuredImage: item.featuredImage || item.thumbnail || undefined,
    publishedAt: item.publishedAt,
    authorUsername: item.authorUsername,
    authorDisplayName: item.author,
    author: {
      id: item.authorId,
      name: item.author || 'Unknown Author',
      displayName: item.author,
      username: item.authorUsername,
    },
    category: toCategory(item.category),
    tags: (item.tags || []).map((t) => ({
      id: t,
      name: t,
      slug: t.toLowerCase().replace(/\s+/g, '-'),
    })),
    _count: { likes: item.likes ?? 0, comments: 0 },
    readingTime: item.readingTime ?? undefined,
    views: item.views ?? 0,
    snippet: item.snippet,
    highlightedTitle: item.highlightedTitle,
  };
}

/** Appending pages can re-deliver a post; duplicate keys break React. */
function dedupeById(posts: BlogCardPost[]): BlogCardPost[] {
  const seen = new Set<string>();
  return posts.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

function v2SortFor(sort: string): string {
  switch (sort) {
    case 'popular':
      return 'views';
    case 'trending':
      return 'trending';
    default:
      return 'relevance';
  }
}

interface InitialPagination {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface BlogHomeProps {
  /** Server-rendered page of "All Articles" — present only in browse mode. */
  initialPosts?: any[] | null;
  initialPagination?: InitialPagination | null;
  /** Server-rendered featured posts (DB `featured` flag), ordering preserved. */
  initialFeatured?: any[] | null;
}

/** Cached browse pages are keyed by the full filter context + page number. */
function makeCacheKey(category: string, sort: string, page: number) {
  return `${category}|${sort}|${page}`;
}

function parsePage(value: string | null | undefined): number {
  const parsed = parseInt(value || '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default function BlogHome({
  initialPosts,
  initialPagination,
  initialFeatured,
}: BlogHomeProps = {}) {
  const searchParams = useSearchParams();

  // Seed from the server payload so Googlebot (and the first paint) get real
  // article markup instead of skeletons.
  const seededPosts = useMemo<BlogCardPost[]>(
    () => (initialPosts?.length ? initialPosts.map(normalizeApiPost) : []),
    [initialPosts]
  );
  const seededFeatured = useMemo<BlogCardPost[]>(
    () => (initialFeatured?.length ? initialFeatured.map(normalizeApiPost) : []),
    [initialFeatured]
  );

  // ── Filter / navigation state ─────────────────────────────────────────────
  // The URL stays the source of truth for sharing, but it is mirrored into
  // state so a page change never has to re-run the blog Server Component.
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
  const [searchInput, setSearchInput] = useState(searchParams?.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') || '');
  const [sortBy] = useState(searchParams?.get('sort') || 'latest');
  const [page, setPage] = useState(() =>
    initialPagination?.currentPage ?? parsePage(searchParams?.get('page'))
  );
  const [searchFocused, setSearchFocused] = useState(false);

  const isSearchMode = searchQuery.trim().length > 0;

  // ── "All Articles" state ──────────────────────────────────────────────────
  const [posts, setPosts] = useState<BlogCardPost[]>(seededPosts);
  const [pagination, setPagination] = useState<InitialPagination | null>(
    initialPagination ?? null
  );
  const [listLoading, setListLoading] = useState(seededPosts.length === 0);
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPosts, setTotalPosts] = useState<number | null>(
    initialPagination?.totalPosts ?? null
  );
  const [hasMore, setHasMore] = useState(initialPagination?.hasNextPage ?? false);

  // ── Featured state (completely independent of All Articles) ───────────────
  const [featuredPosts, setFeaturedPosts] = useState<BlogCardPost[]>(seededFeatured);
  const [featuredLoading, setFeaturedLoading] = useState(seededFeatured.length === 0);

  // ── Trending sidebar: recomputed per filter context, stable across pages ──
  const [trendingPosts, setTrendingPosts] = useState<BlogCardPost[]>(() =>
    [...seededPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5)
  );
  const trendingContextRef = useRef<string | null>(
    seededPosts.length ? `|${selectedCategory}|${sortBy}` : null
  );

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteRef = useRef<SearchAutocompleteHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Search-mode pagination is cursor based.
  const cursorRef = useRef<string | null>(null);

  // Guards the featured request so pagination/re-renders can never fire it twice.
  const featuredFetchedRef = useRef(false);

  // Only the newest request is allowed to write state, so a slow page 2 can
  // never overwrite a page 3 the user has already asked for.
  const requestIdRef = useRef(0);

  // Already-visited browse pages are replayed from memory, which is what makes
  // Back/Forward instant and prevents duplicate API calls.
  const pageCacheRef = useRef<Map<string, { posts: BlogCardPost[]; pagination: InitialPagination }>>(
    new Map(
      seededPosts.length && initialPagination
        ? [
          [
            makeCacheKey(selectedCategory, sortBy, initialPagination.currentPage),
            { posts: seededPosts, pagination: initialPagination },
          ],
        ]
        : []
    )
  );

  /** Identifies exactly which dataset should currently be on screen. */
  const dataKey = `${searchQuery.trim()}|${selectedCategory}|${sortBy}|${page}`;
  const loadedKeyRef = useRef<string | null>(seededPosts.length ? dataKey : null);

  // Search click attribution
  const queryIdRef = useRef<string | undefined>(undefined);
  const renderedAtRef = useRef(0);

  /**
   * Push the new filter/page state into the URL *without* re-running the
   * server render. `history.pushState` is integrated with the App Router, so
   * the URL stays shareable and Back/Forward keeps working, while the page
   * itself (header, featured rail, sidebar) is never torn down.
   */
  const pushUrlState = useCallback(
    (updates: Record<string, string | null>, options: { replace?: boolean } = {}) => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      const url = qs ? `/blog?${qs}` : '/blog';
      if (options.replace) window.history.replaceState(null, '', url);
      else window.history.pushState(null, '', url);
    },
    []
  );

  const applyTrending = useCallback(
    (source: BlogCardPost[], contextKey: string) => {
      // Keep the sidebar stable while paginating; refresh it when the filter
      // context (search / category / sort) actually changes.
      if (trendingContextRef.current === contextKey) return;
      trendingContextRef.current = contextKey;
      setTrendingPosts([...source].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
    },
    []
  );

  // ── Featured posts: fetched once, never refetched by pagination ───────────
  useEffect(() => {
    // Already seeded by the server render, already fetched, or hidden because
    // the user is searching — in all three cases there is nothing to request.
    if (seededFeatured.length > 0 || featuredFetchedRef.current) return;
    if (isSearchMode) {
      setFeaturedLoading(false);
      return;
    }

    featuredFetchedRef.current = true;
    let cancelled = false;
    (async () => {
      setFeaturedLoading(true);
      try {
        const res = await fetch(`/api/blog/posts?featured=true&limit=${FEATURED_LIMIT}`);
        if (!res.ok) throw new Error(`Failed to load featured posts (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        setFeaturedPosts((data.posts || []).map(normalizeApiPost));
      } catch (err) {
        // A failed featured fetch must never break the main listing.
        console.error('Error fetching featured posts:', err);
        if (!cancelled) setFeaturedPosts([]);
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSearchMode, seededFeatured.length]);

  // ── Browse-mode page fetch (server-side pagination via existing API) ──────
  const fetchBrowsePage = useCallback(
    async (targetPage: number, key: string) => {
      const cacheKey = makeCacheKey(selectedCategory, sortBy, targetPage);
      const cached = pageCacheRef.current.get(cacheKey);
      const contextKey = `|${selectedCategory}|${sortBy}`;

      if (cached) {
        requestIdRef.current += 1;
        loadedKeyRef.current = key;
        setPosts(cached.posts);
        setPagination(cached.pagination);
        setTotalPosts(cached.pagination.totalPosts);
        setHasMore(cached.pagination.hasNextPage);
        setError(null);
        setListLoading(false);
        setPendingPage(null);
        applyTrending(cached.posts, contextKey);
        return;
      }

      const requestId = ++requestIdRef.current;
      setListLoading(true);
      setPendingPage(targetPage);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(PAGE_SIZE),
          sort: sortBy,
        });
        if (selectedCategory) params.set('category', selectedCategory);

        const res = await fetch(`/api/blog/posts?${params}`);
        if (!res.ok) throw new Error(`Failed to load posts (${res.status})`);
        const data = await res.json();
        if (requestId !== requestIdRef.current) return;

        const mapped: BlogCardPost[] = (data.posts || []).map(normalizeApiPost);
        const meta: InitialPagination = {
          currentPage: data.pagination?.currentPage ?? targetPage,
          totalPages: data.pagination?.totalPages ?? 1,
          totalPosts: data.pagination?.totalPosts ?? mapped.length,
          hasNextPage: Boolean(data.pagination?.hasNextPage),
          hasPrevPage: Boolean(data.pagination?.hasPrevPage),
        };

        pageCacheRef.current.set(cacheKey, { posts: mapped, pagination: meta });
        loadedKeyRef.current = key;
        setPosts(mapped);
        setPagination(meta);
        setTotalPosts(meta.totalPosts);
        setHasMore(meta.hasNextPage);
        applyTrending(mapped, contextKey);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        console.error('Error fetching posts:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setPosts([]);
        setHasMore(false);
      } finally {
        if (requestId === requestIdRef.current) {
          setListLoading(false);
          setPendingPage(null);
        }
      }
    },
    [applyTrending, selectedCategory, sortBy]
  );

  // ── Search-mode fetch (cursor based, "Load more") ─────────────────────────
  const fetchSearch = useCallback(
    async (append: boolean, key?: string) => {
      const query = searchQuery.trim();
      if (!query) return;

      const requestId = append ? requestIdRef.current : ++requestIdRef.current;
      append ? setLoadingMore(true) : setListLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: query,
          limit: String(PAGE_SIZE),
          sort: v2SortFor(sortBy),
        });
        if (selectedCategory) params.set('categories', selectedCategory);
        if (append && cursorRef.current) params.set('cursor', cursorRef.current);

        const res = await fetch(`/api/blog/search?${params}`);
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const data = await res.json();
        if (!append && requestId !== requestIdRef.current) return;

        const mapped: BlogCardPost[] = (data.results || []).map(normalizeSearchResult);
        setPosts((prev) => (append ? dedupeById([...prev, ...mapped]) : mapped));
        cursorRef.current = data.nextCursor || null;
        setHasMore(Boolean(data.nextCursor));
        setTotalPosts(typeof data.total === 'number' ? data.total : null);
        setPagination(null);
        queryIdRef.current = data.queryId;
        renderedAtRef.current = Date.now();
        if (!append) {
          if (key) loadedKeyRef.current = key;
          applyTrending(mapped, `${query}|${selectedCategory}|${sortBy}`);
        }
      } catch (err) {
        console.error('Error searching posts:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        if (!append) setPosts([]);
        setHasMore(false);
      } finally {
        setListLoading(false);
        setLoadingMore(false);
      }
    },
    [applyTrending, searchQuery, selectedCategory, sortBy]
  );

  // Single orchestrator: whatever the current context is, make sure the
  // matching dataset is loaded. Server-seeded data is never refetched.
  useEffect(() => {
    if (loadedKeyRef.current === dataKey) return;

    if (isSearchMode) {
      cursorRef.current = null;
      fetchSearch(false, dataKey);
    } else {
      fetchBrowsePage(page, dataKey);
    }
    // `dataKey` already encodes every input that should trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  // ── Browser Back / Forward ────────────────────────────────────────────────
  // `history.pushState` entries have no RSC payload, so the URL is replayed
  // into state here; cached pages then render instantly with no new request.
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const nextSearch = params.get('search') || '';
      const nextCategory = params.get('category') || '';
      const nextPage = parsePage(params.get('page'));

      setSearchQuery(nextSearch);
      setSearchInput(nextSearch);
      setSelectedCategory(nextCategory);
      setPage(nextPage);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /** Bring the listing back into view without hiding it behind the sticky bar. */
  const scrollToList = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, []);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      // Guard: never queue a second request while one is in flight, and ignore
      // repeated clicks on the page that is already active.
      if (listLoading || pendingPage !== null) return;
      const totalPages = pagination?.totalPages ?? 1;
      const target = Math.min(Math.max(1, nextPage), Math.max(1, totalPages));
      if (target === page) return;

      setPage(target);
      pushUrlState({ page: target > 1 ? String(target) : null });
      scrollToList();
    },
    [listLoading, page, pagination?.totalPages, pendingPage, pushUrlState, scrollToList]
  );

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1);
      pushUrlState({ search: value || null, page: null });
    }, 500);
  };

  const handlePostClick = (_e: React.MouseEvent, post: BlogCardPost, position?: number) => {
    if (!isSearchMode) return;
    trackSearchClick({
      queryId: queryIdRef.current,
      query: searchQuery.trim(),
      postId: post.id,
      source: 'results',
      position,
      timeToClickMs: renderedAtRef.current ? Date.now() - renderedAtRef.current : undefined,
    });
  };

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    if (suggestion.type === 'category') {
      const entry = (Object.keys(BLOG_CATEGORIES) as BlogCategory[]).find(
        (key) => BLOG_CATEGORIES[key].name.toLowerCase() === suggestion.text.toLowerCase()
      );
      if (entry) {
        setSelectedCategory(entry);
        setSearchInput('');
        setSearchQuery('');
        setPage(1);
        pushUrlState({ category: entry, search: null, page: null });
        return;
      }
    }
    setSearchInput(suggestion.text);
    setSearchQuery(suggestion.text);
    setPage(1);
    pushUrlState({ search: suggestion.text, page: null });
  };

  const handleCategorySelect = (value: string) => {
    if (value === selectedCategory) return;
    setSelectedCategory(value);
    setPage(1);
    pushUrlState({ category: value || null, page: null });
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedCategory('');
    setPage(1);
    pushUrlState({ search: null, category: null, page: null });
  };

  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.currentPage ?? page;

  const resultLabel = isSearchMode
    ? `${totalPosts ?? posts.length} result${(totalPosts ?? posts.length) === 1 ? '' : 's'} for “${searchQuery.trim()}”`
    : selectedCategory
      ? BLOG_CATEGORIES[selectedCategory as BlogCategory]?.name
      : null;

  // Range label ("Showing 13–24 of 96") derived from existing API metadata —
  // no extra requests needed.
  const rangeLabel = useMemo(() => {
    if (isSearchMode || !pagination || posts.length === 0) return null;
    const start = (pagination.currentPage - 1) * PAGE_SIZE + 1;
    const end = start + posts.length - 1;
    return `Showing ${start}–${end} of ${pagination.totalPosts} articles`;
  }, [isSearchMode, pagination, posts.length]);

  // Match the skeleton count to what is on screen so paging never jumps.
  const skeletonCount = posts.length > 0 ? posts.length : PAGE_SIZE;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ── SEO H1 (screen-reader only) ──────────────────────────────────── */}
      <h1 className="sr-only">
        Poultry Market Blog — Poultry Farming Guides, Health Tips & Kenya Market Insights
      </h1>

      {/* ── Slim Search Bar ──────────────────────────────────────────────── */}
      <div className="sticky top-12 sm:top-16 z-40 border-b border-gray-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <label htmlFor="blog-search" className="sr-only">
              Search articles
            </label>
            <Input
              id="blog-search"
              type="search"
              placeholder="Search articles..."
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(e) => autocompleteRef.current?.handleKeyDown(e)}
              className="h-9 rounded-lg border border-gray-300 bg-white pl-9 pr-9 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:h-10"
            />
            {searchInput !== searchQuery && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-500" />
            )}
            <SearchAutocomplete
              ref={autocompleteRef}
              query={searchInput}
              inputFocused={searchFocused}
              onSelect={handleSuggestionSelect}
            />
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 pt-4 pb-10 sm:px-6 lg:px-8">
        <FilterChips
          chips={FILTER_CHIPS}
          selected={selectedCategory}
          onSelect={handleCategorySelect}
          className="mb-4"
        />

        <div className="space-y-8 sm:space-y-10">
          {/* Ad: Blog Top */}
          <AdSlot name="blogTop" />

          {/*
            FEATURED POSTS — driven by the DB `featured` flag and completely
            independent of the All Articles pagination below, so paging never
            replaces or reloads this rail.
          */}
          {!isSearchMode && (
            <FeaturedCarousel
              posts={featuredPosts}
              loading={featuredLoading}
              onPostClick={handlePostClick}
            />
          )}

          {/* ── ALL ARTICLES + TRENDING ──────────────────────────────────── */}
          <div ref={listRef} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <section aria-label="All articles" className="lg:col-span-2">
              <SectionHeader
                title={isSearchMode ? 'Search Results' : 'All Articles'}
                icon={<LayoutGrid className="h-5 w-5" />}
                description={resultLabel || rangeLabel || undefined}
                action={
                  listLoading && posts.length > 0 ? (
                    <span className="hidden items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 sm:flex">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Loading…
                    </span>
                  ) : undefined
                }
              />

              {/* Only this region swaps between skeletons, cards and messages —
                  the header, featured rail and sidebar stay mounted. */}
              <div aria-busy={listLoading || undefined} aria-live="polite">
                {listLoading ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
                    {Array.from({ length: skeletonCount }).map((_, i) => (
                      <GridCardSkeleton key={`post-skeleton-${i}`} />
                    ))}
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/30">
                    <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-300">
                      Couldn&apos;t load articles
                    </h3>
                    <p className="mb-5 text-sm text-red-600 dark:text-red-400">{error}</p>
                    <Button
                      onClick={() =>
                        isSearchMode ? fetchSearch(false, dataKey) : fetchBrowsePage(page, dataKey)
                      }
                      className="rounded-full px-8"
                    >
                      Try Again
                    </Button>
                  </div>
                ) : posts.length === 0 ? (
                  <EmptyState
                    variant={
                      isSearchMode ? 'no-results' : selectedCategory ? 'no-category' : 'no-posts'
                    }
                    onAction={resetFilters}
                    actionLabel="View All Posts"
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
                    {posts.map((post, i) => (
                      <GridCard
                        key={post.id}
                        post={post}
                        onClick={(e) => handlePostClick(e, post, i)}
                      />
                    ))}
                  </div>
                )}

                {/* Appending skeletons keep the height stable in search mode */}
                {loadingMore && (
                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <GridCardSkeleton key={`more-skeleton-${i}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Ad: Blog Inline — stable node, so paging never re-pushes it */}
              <AdSlot name="blogInline" format="fluid" className="mt-6" />

              {/* Pagination (browse) or Load More (search) */}
              {!isSearchMode ? (
                totalPages > 1 && (
                  <div className="mt-6 space-y-3">
                    <BlogPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      category={selectedCategory}
                      sort={sortBy}
                      onPageChange={handlePageChange}
                      isLoading={listLoading || pendingPage !== null}
                      pendingPage={pendingPage}
                    />
                    <p className="text-center text-xs text-gray-500 dark:text-slate-400">
                      Page {currentPage} of {totalPages}
                      {totalPosts !== null ? ` · ${totalPosts} articles` : ''}
                    </p>
                  </div>
                )
              ) : hasMore ? (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <Button
                    onClick={() => !loadingMore && fetchSearch(true)}
                    disabled={loadingMore}
                    size="lg"
                    className="h-12 w-full max-w-xs rounded-full bg-emerald-600 px-10 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-700 disabled:opacity-70 sm:w-auto"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                        Loading more…
                      </>
                    ) : (
                      'Load More Articles'
                    )}
                  </Button>
                  {totalPosts !== null && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Showing {posts.length} of {totalPosts} articles
                    </p>
                  )}
                </div>
              ) : (
                posts.length > 0 && (
                  <p className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    You&apos;ve reached the end — {posts.length} results.
                  </p>
                )
              )}
            </section>

            {/* Sidebar stays mounted across page changes */}
            <div className="space-y-6">
              <TrendingSidebar
                posts={trendingPosts}
                loading={listLoading && trendingPosts.length === 0}
                onPostClick={(e, post) => handlePostClick(e, post)}
              />
              <AdSlot name="blogSidebar" className="hidden lg:block" />
            </div>
          </div>

          {/* Ad: Blog Bottom */}
          <AdSlot name="blogBottom" className="py-2" />

          <NewsletterCTA
            onSubscribe={async (email) => {
              console.log('Newsletter subscribe:', email);
              // TODO: wire to the newsletter endpoint once available
            }}
          />
        </div>
      </main>
    </div>
  );
}
