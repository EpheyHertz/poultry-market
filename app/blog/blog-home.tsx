'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Loader2, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BLOG_CATEGORIES, type BlogCategory } from '@/types/blog';
import { trackSearchClick } from '@/lib/search-v2/trackClick';
import SearchAutocomplete, { SearchAutocompleteHandle, Suggestion } from '@/components/blog/search-autocomplete';
import {
  FeaturedCard,
  HorizontalCard,
  CompactCard,
  GridCard,
  type BlogCardPost,
} from '@/components/blog/cards';
import {
  FeaturedCardSkeleton,
  HorizontalCardSkeleton,
  GridCardSkeleton,
  CompactCardSkeleton,
} from '@/components/blog/skeletons';
import {
  SectionHeader,
  FilterChips,
  type FilterChip,
  TrendingSidebar,
  NewsletterCTA,
  EmptyState,
} from '@/components/blog/sections';
import AdSlot from '@/components/ads/ad-slot';
import { BlogPagination } from '@/components/blog/pagination';

const PAGE_SIZE = 12;


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
  /** Server-rendered first page — present only in browse mode (no ?search=). */
  initialPosts?: any[] | null;
  initialPagination?: InitialPagination | null;
}

export default function BlogHome({ initialPosts, initialPagination }: BlogHomeProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Seed from the server payload so Googlebot (and the first paint) get real
  // article markup instead of skeletons.
  const seededPosts = useMemo<BlogCardPost[]>(
    () => (initialPosts?.length ? initialPosts.map(normalizeApiPost) : []),
    [initialPosts]
  );

  const [posts, setPosts] = useState<BlogCardPost[]>(seededPosts);
  const [loading, setLoading] = useState(seededPosts.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPosts, setTotalPosts] = useState<number | null>(
    initialPagination?.totalPosts ?? null
  );
  const [hasMore, setHasMore] = useState(initialPagination?.hasNextPage ?? false);


  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
  const [searchInput, setSearchInput] = useState(searchParams?.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') || '');
  const [sortBy] = useState(searchParams?.get('sort') || 'latest');
  const [searchFocused, setSearchFocused] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteRef = useRef<SearchAutocompleteHandle>(null);

  // Pagination cursors: browse mode is offset-based, search mode is cursor-based.
  const pageRef = useRef(1);
  const cursorRef = useRef<string | null>(null);
  
  // Skip the initial refetch when we have seeded SSR data
  const skipInitialFetchRef = useRef(seededPosts.length > 0);

  // Search click attribution
  const queryIdRef = useRef<string | undefined>(undefined);
  const renderedAtRef = useRef(0);

  // router.push during the first render throws "Router action dispatched before
  // initialization", so URL sync is gated until after mount.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const isSearchMode = searchQuery.trim().length > 0;

  const fetchPosts = useCallback(
    async (append: boolean) => {
      const query = searchQuery.trim();
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);

      try {
        if (query) {
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

          const mapped = (data.results || []).map(normalizeSearchResult);
          setPosts((prev) => (append ? dedupeById([...prev, ...mapped]) : mapped));
          cursorRef.current = data.nextCursor || null;
          setHasMore(Boolean(data.nextCursor));
          setTotalPosts(typeof data.total === 'number' ? data.total : null);
          queryIdRef.current = data.queryId;
          renderedAtRef.current = Date.now();
        } else {
          const nextPage = append ? pageRef.current + 1 : 1;
          const params = new URLSearchParams({
            page: String(nextPage),
            limit: String(PAGE_SIZE),
            sort: sortBy,
          });
          if (selectedCategory) params.set('category', selectedCategory);

          const res = await fetch(`/api/blog/posts?${params}`);
          if (!res.ok) throw new Error(`Failed to load posts (${res.status})`);
          const data = await res.json();

          const mapped = (data.posts || []).map(normalizeApiPost);
          setPosts((prev) => (append ? dedupeById([...prev, ...mapped]) : mapped));
          pageRef.current = nextPage;
          setHasMore(Boolean(data.pagination?.hasNextPage));
          setTotalPosts(data.pagination?.totalPosts ?? null);
        }
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        if (!append) setPosts([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchQuery, selectedCategory, sortBy]
  );

  // Any change to query/category/sort restarts pagination from the first page.
  useEffect(() => {
    // Skip the initial fetch if we already have server-rendered posts
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }
    
    pageRef.current = 1;
    cursorRef.current = null;
    fetchPosts(false);
  }, [fetchPosts]);

  const updateURL = useCallback(
    (updates: Record<string, string>) => {
      if (!mountedRef.current) return;
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      for (const [key, value] of Object.entries(updates)) {
        value ? params.set(key, value) : params.delete(key);
      }
      const qs = params.toString();
      router.push(qs ? `/blog?${qs}` : '/blog', { scroll: false });
    },
    [router, searchParams]
  );

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
      updateURL({ search: value });
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
        updateURL({ category: entry, search: '' });
        return;
      }
    }
    setSearchInput(suggestion.text);
    setSearchQuery(suggestion.text);
    updateURL({ search: suggestion.text });
  };

  const handleCategorySelect = (value: string) => {
    setSelectedCategory(value);
    updateURL({ category: value });
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedCategory('');
    updateURL({ search: '', category: '' });
  };

  // Layout slices. Everything past the hero block lands in "All Articles" so no
  // fetched post is ever silently dropped from the page.
  const { featuredPost, sidePosts, latestPosts, restPosts, trendingPosts } = useMemo(() => {
    return {
      featuredPost: posts[0],
      sidePosts: posts.slice(1, 3),
      latestPosts: posts.slice(3, 9),
      restPosts: posts.slice(9),
      trendingPosts: [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    };
  }, [posts]);

  const resultLabel = isSearchMode
    ? `${totalPosts ?? posts.length} result${(totalPosts ?? posts.length) === 1 ? '' : 's'} for “${searchQuery.trim()}”`
    : selectedCategory
      ? BLOG_CATEGORIES[selectedCategory as BlogCategory]?.name
      : null;

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

        {resultLabel && !loading && (
          <p className="mb-3 text-sm text-gray-600 dark:text-slate-400">{resultLabel}</p>
        )}

        {loading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <FeaturedCardSkeleton />
              </div>
              <div className="space-y-6">
                <GridCardSkeleton />
                <GridCardSkeleton />
              </div>
            </div>
            <div className="space-y-4">
              <HorizontalCardSkeleton />
              <HorizontalCardSkeleton />
              <HorizontalCardSkeleton />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/30">
            <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-300">
              Couldn&apos;t load articles
            </h3>
            <p className="mb-5 text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button onClick={() => fetchPosts(false)} className="rounded-full px-8">
              Try Again
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            variant={isSearchMode ? 'no-results' : selectedCategory ? 'no-category' : 'no-posts'}
            onAction={resetFilters}
            actionLabel="View All Posts"
          />
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {/* Ad: Blog Top */}
            {posts.length > 0 && <AdSlot name="blogTop" className="mb-4" />}

            {/* Featured */}
            <section aria-labelledby="featured-heading">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
                <div className="lg:col-span-2">
                  <FeaturedCard
                    post={featuredPost}
                    onClick={(e) => handlePostClick(e, featuredPost, 0)}
                    priority
                  />
                </div>
                {sidePosts.length > 0 && (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 lg:gap-6">
                    {sidePosts.map((post, i) => (
                      <GridCard
                        key={post.id}
                        post={post}
                        onClick={(e) => handlePostClick(e, post, i + 1)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Latest + Trending */}
            {latestPosts.length > 0 && (
              <section aria-labelledby="latest-heading">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-8">
                  <div className="lg:col-span-2">
                    <SectionHeader title="Latest Articles" description="Fresh from our community" />
                    <div className="space-y-4">
                      {latestPosts.map((post, i) => {
                        // Insert inline ad as 4th item (index 3)
                        if (i === 3) {
                          return (
                            <div key={`ad-inline-${i}`}>
                              <AdSlot name="blogInline" format="fluid" className="mb-4" />
                              <HorizontalCard
                                key={post.id}
                                post={post}
                                onClick={(e) => handlePostClick(e, post, i + 3)}
                              />
                            </div>
                          );
                        }
                        return (
                          <HorizontalCard
                            key={post.id}
                            post={post}
                            onClick={(e) => handlePostClick(e, post, i + 3)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <TrendingSidebar
                      posts={trendingPosts}
                      onPostClick={(e, post) => handlePostClick(e, post)}
                    />
                    {/* Ad: Blog Sidebar (desktop only) */}
                    {posts.length > 0 && <AdSlot name="blogSidebar" className="hidden lg:block" />}
                  </div>
                </div>
              </section>
            )}

            {/* All Articles — everything else, including each loaded page */}
            {restPosts.length > 0 && (
              <section aria-labelledby="all-heading">
                <SectionHeader
                  title="All Articles"
                  icon={<LayoutGrid className="h-5 w-5" />}
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                  {restPosts.map((post, i) => (
                    <CompactCard
                      key={post.id}
                      post={post}
                      onClick={(e) => handlePostClick(e, post, i + 9)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Appending skeletons keep the page height stable while loading */}
            {loadingMore && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CompactCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Ad: Blog Bottom */}
            {posts.length > 0 && <AdSlot name="blogBottom" className="py-2" />}

            {/* Load More (search mode) or Pagination (browse mode) */}
            {!isSearchMode && initialPagination ? (
              <BlogPagination
                currentPage={initialPagination.currentPage}
                totalPages={initialPagination.totalPages}
                category={selectedCategory}
                className="pt-4"
              />
            ) : hasMore ? (
              <div className="flex flex-col items-center gap-3 pt-2">
                <Button
                  onClick={() => !loadingMore && fetchPosts(true)}
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
              posts.length > PAGE_SIZE && (
                <p className="pt-2 text-center text-sm text-gray-500 dark:text-slate-400">
                  You&apos;ve reached the end — {posts.length} articles.
                </p>
              )
            )}

            <NewsletterCTA
              onSubscribe={async (email) => {
                console.log('Newsletter subscribe:', email);
                // TODO: wire to the newsletter endpoint once available
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
