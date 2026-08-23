'use client';

/**
 * Public author profile — an editorial author page, not a social profile.
 *
 * Design rules followed (blog_author_chnges.md):
 *  - §9/§10/§24: restrained header (avatar, name, professional title, location,
 *    bio, expertise, socials, contact), no oversized hero, no gradient name,
 *    no glassmorphism. Same cards/typography/spacing as the rest of the blog.
 *  - §12: articles reuse the existing `components/blog/cards` system — no new
 *    card design — with category filtering and pagination.
 *  - §18: only metrics that genuinely exist in the backend are displayed.
 *  - §28: analytics go through the existing `trackEvent()` helper.
 *  - §32: every optional block is omitted entirely when empty.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  FileText,
  Gift,
  LayoutDashboard,
  Mail,
  MapPin,
  PenTool,
  Settings,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import PublicNavbar from '@/components/layout/public-navbar';
import FollowButton from '@/components/blog/follow-button';
import AuthorSocialLinks from '@/components/author/author-social-links';
import { AuthorResourcesSection } from '@/components/author/author-resource-card';
import { GridCard } from '@/components/blog/cards';
import type { BlogCardPost } from '@/components/blog/cards/types';
import { trackEvent } from '@/components/analytics/google-analytics';
import { BLOG_CATEGORIES, type BlogCategory } from '@/types/blog';
import type { AuthorSocialLink, AuthorSocialPlatform } from '@/lib/author-profile';
import { formatAuthorStat } from '@/lib/author-profile';
import type { AuthorResourceView } from '@/lib/author-resources';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Props                                                                      */
/* -------------------------------------------------------------------------- */

export interface AuthorProfilePost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  category: string;
  readingTime?: number | null;
  viewCount: number;
  publishedAt: string | null;
  authorId: string;
  authorName: string;
  tags: Array<{ id: string; name: string; slug: string }>;
  likes: number;
  comments: number;
}

export interface PublicAuthorProfileData {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  /** Short bio shown in the header. */
  bio?: string | null;
  /** Optional one-liner; used as the professional title fallback. */
  tagline?: string | null;
  /** "Poultry Health Specialist at Sunrise Farm" — already composed. */
  professionalTitle?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  location?: string | null;
  expertise: string[];
  isVerified: boolean;
  /** Pre-validated, safe http(s) links only. */
  socialLinks: AuthorSocialLink[];
  /** Present only when the author opted in to a public contact address. */
  contactEmail?: string | null;
  joinedLabel?: string | null;
  stats: {
    posts: number;
    views: number;
    likes: number;
    followers: number;
  };
  supportEnabled: boolean;
  /**
   * Active recommended / affiliate resources, already ordered and filtered by
   * the server. Metadata is stored, so rendering never touches the merchant
   * (ext §24).
   */
  resources: AuthorResourceView[];
  posts: AuthorProfilePost[];
}

interface PublicAuthorProfileProps {
  profile: PublicAuthorProfileData;
}

const POSTS_PER_PAGE = 9;
const ALL_CATEGORIES = 'ALL';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function categoryName(value: string): string {
  return BLOG_CATEGORIES[value as BlogCategory]?.name ?? value.replace(/_/g, ' ');
}

/** Map the author's post into the shared blog-card shape (one source of truth). */
function toCardPost(post: AuthorProfilePost, profile: PublicAuthorProfileData): BlogCardPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    featuredImage: post.featuredImage ?? undefined,
    publishedAt: post.publishedAt,
    authorUsername: profile.username,
    authorDisplayName: profile.displayName,
    authorAvatarUrl: profile.avatarUrl ?? undefined,
    authorIsVerified: profile.isVerified,
    author: {
      id: post.authorId,
      name: post.authorName,
      displayName: profile.displayName,
      username: profile.username,
      avatarUrl: profile.avatarUrl ?? undefined,
      isVerified: profile.isVerified,
    },
    category: post.category
      ? { id: post.category, name: categoryName(post.category), slug: post.category }
      : undefined,
    tags: post.tags,
    _count: { likes: post.likes, comments: post.comments },
    readingTime: post.readingTime ?? undefined,
    views: post.viewCount,
  };
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function PublicAuthorProfile({ profile }: PublicAuthorProfileProps) {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [page, setPage] = useState(1);
  const articlesRef = useRef<HTMLDivElement | null>(null);

  /* --- viewer identity (existing endpoint, used only for owner/follow UI) -- */
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setViewerId(data?.id ?? null);
        setViewerLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setViewerLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* --- author_profile_view (existing analytics infrastructure) ------------ */
  useEffect(() => {
    trackEvent('author_profile_view', {
      author_username: profile.username,
      author_id: profile.id,
    });
  }, [profile.id, profile.username]);

  const isOwner = viewerId !== null && viewerId === profile.userId;

  /* --- derived article collections --------------------------------------- */
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of profile.posts) {
      if (!post.category) continue;
      counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, label: categoryName(value) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [profile.posts]);

  const filteredPosts = useMemo(() => {
    if (category === ALL_CATEGORIES) return profile.posts;
    return profile.posts.filter((post) => post.category === category);
  }, [profile.posts, category]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visiblePosts = useMemo(
    () => filteredPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE),
    [filteredPosts, currentPage],
  );

  const goToPage = useCallback((next: number) => {
    setPage(next);
    articlesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value);
    setPage(1);
  }, []);

  /* --- analytics handlers ------------------------------------------------ */
  const handleSocialClick = useCallback(
    (platform: AuthorSocialPlatform) => {
      trackEvent('author_social_click', {
        author_username: profile.username,
        platform,
        source: 'author_profile',
      });
    },
    [profile.username],
  );

  const handleEmailClick = useCallback(() => {
    trackEvent('author_email_click', {
      author_username: profile.username,
      source: 'author_profile',
    });
  }, [profile.username]);

  const handleFollowChange = useCallback(
    (following: boolean) => {
      trackEvent('author_follow', {
        author_username: profile.username,
        action: following ? 'follow' : 'unfollow',
      });
    },
    [profile.username],
  );

  const handleArticleClick = useCallback(
    (post: AuthorProfilePost) => {
      trackEvent('author_article_click', {
        author_username: profile.username,
        post_slug: post.slug,
      });
    },
    [profile.username],
  );

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = `${profile.displayName} — PoultryMarket Kenya`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied');
    } catch {
      /* user cancelled or clipboard unavailable — nothing to report */
    }
  }, [profile.displayName]);

  /* --- header pieces ----------------------------------------------------- */
  const avatar = profile.avatarUrl ?? undefined;
  const professionalTitle = profile.professionalTitle || profile.tagline || null;
  const bio = (profile.bio ?? '').trim();
  const publishedCount = profile.posts.length || profile.stats.posts;

  // Only stats that are genuinely backed by the database are shown (§18).
  const stats = [
    {
      key: 'articles',
      label: publishedCount === 1 ? 'Article' : 'Articles',
      value: publishedCount,
      show: true,
    },
    { key: 'views', label: 'Total views', value: profile.stats.views, show: profile.stats.views > 0 },
    {
      key: 'followers',
      label: profile.stats.followers === 1 ? 'Follower' : 'Followers',
      value: profile.stats.followers,
      show: profile.stats.followers > 0,
    },
    { key: 'likes', label: 'Likes', value: profile.stats.likes, show: profile.stats.likes > 0 },
  ].filter((stat) => stat.show);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PublicNavbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Breadcrumb / back */}
        <nav aria-label="Breadcrumb" className="mb-5">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to blog
          </Link>
        </nav>

        {/* ---------------------------------------------------------------- */}
        {/*  Author header                                                   */}
        {/* ---------------------------------------------------------------- */}
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Slim cover strip: only when the author actually uploaded one. */}
          {profile.coverImageUrl ? (
            <div className="relative h-24 w-full sm:h-32">
              <Image
                src={profile.coverImageUrl}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
                priority={false}
              />
            </div>
          ) : null}

          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
              {/* Avatar */}
              <div className="shrink-0">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={`${profile.displayName} profile photo`}
                    width={112}
                    height={112}
                    sizes="112px"
                    className="h-20 w-20 rounded-full border border-slate-200 object-cover sm:h-28 sm:w-28 dark:border-slate-700"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-emerald-50 text-xl font-semibold text-emerald-700 sm:h-28 sm:w-28 sm:text-2xl dark:border-slate-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  >
                    {initials(profile.displayName)}
                  </div>
                )}
              </div>

              {/* Identity */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    {profile.displayName}
                  </h1>
                  {profile.isVerified ? (
                    <span
                      className="inline-flex items-center text-emerald-600 dark:text-emerald-400"
                      title="Verified author"
                    >
                      <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">Verified author</span>
                    </span>
                  ) : null}
                </div>

                {professionalTitle ? (
                  <p className="mt-1 text-base font-medium text-emerald-700 dark:text-emerald-400">
                    {professionalTitle}
                  </p>
                ) : null}

                {/* Meta line: location · joined · article count */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  {profile.location ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {profile.location}
                    </span>
                  ) : null}
                  {profile.joinedLabel ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      Joined {profile.joinedLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    {formatAuthorStat(publishedCount)} published{' '}
                    {publishedCount === 1 ? 'article' : 'articles'}
                  </span>
                </div>

                {bio ? (
                  <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-slate-700 dark:text-slate-300">
                    {bio}
                  </p>
                ) : null}

                {/* Expertise — clean tags, not hashtags */}
                {profile.expertise.length > 0 ? (
                  <div className="mt-4">
                    <h2 className="sr-only">Areas of expertise</h2>
                    <ul className="flex flex-wrap gap-2">
                      {profile.expertise.map((item) => (
                        <li
                          key={item}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {isOwner ? (
                    <>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/author/dashboard">
                          <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                          Dashboard
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/author/profile/edit">
                          <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                          Edit profile
                        </Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href="/author/posts/new">
                          <PenTool className="mr-2 h-4 w-4" aria-hidden="true" />
                          New article
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      {viewerLoaded ? (
                        <FollowButton
                          userId={profile.userId}
                          onFollowChange={handleFollowChange}
                        />
                      ) : null}
                      {profile.supportEnabled ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/support/${profile.id}`}>
                            <Gift className="mr-2 h-4 w-4" aria-hidden="true" />
                            Support author
                          </Link>
                        </Button>
                      ) : null}
                    </>
                  )}

                  {/* Public contact — only when explicitly opted in */}
                  {profile.contactEmail ? (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={`mailto:${profile.contactEmail}`}
                        onClick={handleEmailClick}
                        aria-label={`Email ${profile.displayName}`}
                      >
                        <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                        Email author
                      </a>
                    </Button>
                  ) : null}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleShare}
                    aria-label={`Share ${profile.displayName}'s profile`}
                  >
                    <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats + socials footer of the header */}
            {(stats.length > 0 || profile.socialLinks.length > 0) && (
              <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {stats.map((stat) => (
                    <div key={stat.key} className="flex items-baseline gap-1.5">
                      <dd className="text-base font-semibold text-slate-900 dark:text-white">
                        {formatAuthorStat(stat.value)}
                      </dd>
                      <dt className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</dt>
                    </div>
                  ))}
                </dl>

                <AuthorSocialLinks
                  links={profile.socialLinks}
                  authorName={profile.displayName}
                  size="md"
                  onLinkClick={handleSocialClick}
                />
              </div>
            )}
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/*  Articles                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section ref={articlesRef} className="mt-10 scroll-mt-24" aria-labelledby="author-articles-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="author-articles-heading"
                className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white"
              >
                Articles by {profile.displayName.split(' ')[0]}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filteredPosts.length === 0
                  ? 'No published articles yet'
                  : `${formatAuthorStat(filteredPosts.length)} ${filteredPosts.length === 1 ? 'article' : 'articles'}`}
              </p>
            </div>
          </div>

          {/* Category filter — only when there is something to filter */}
          {categories.length > 1 ? (
            <div className="mt-4 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              <div className="flex items-center gap-2" role="group" aria-label="Filter articles by category">
                <FilterChip
                  active={category === ALL_CATEGORIES}
                  onClick={() => handleCategoryChange(ALL_CATEGORIES)}
                >
                  All
                </FilterChip>
                {categories.map((item) => (
                  <FilterChip
                    key={item.value}
                    active={category === item.value}
                    onClick={() => handleCategoryChange(item.value)}
                  >
                    {item.label}
                    <span className="ml-1.5 text-xs opacity-70">{item.count}</span>
                  </FilterChip>
                ))}
              </div>
            </div>
          ) : null}

          {visiblePosts.length > 0 ? (
            <>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visiblePosts.map((post) => (
                  <GridCard
                    key={post.id}
                    post={toCardPost(post, profile)}
                    onClick={() => handleArticleClick(post)}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <nav
                  aria-label="Article pagination"
                  className="mt-8 flex items-center justify-center gap-3"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </nav>
              ) : null}
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <FileText
                className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                {category === ALL_CATEGORIES
                  ? `${profile.displayName} hasn't published any articles yet.`
                  : 'No articles in this category yet.'}
              </p>
              {category === ALL_CATEGORIES ? (
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/blog">Explore the blog</Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => handleCategoryChange(ALL_CATEGORIES)}
                >
                  Show all articles
                </Button>
              )}
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  Recommended resources (ext §12 — full section lives here)         */}
        {/*  Renders nothing when the author has none (ext §29).              */}
        {/* ---------------------------------------------------------------- */}
        <AuthorResourcesSection
          id="author-resources"
          resources={profile.resources}
          authorName={profile.displayName}
          authorId={profile.id}
          placement="author_profile"
          className="mt-12"
        />

        {/* ---------------------------------------------------------------- */}
        {/*  Follow / connect footer                                          */}
        {/* ---------------------------------------------------------------- */}
        {profile.socialLinks.length > 0 || profile.contactEmail ? (
          <section
            aria-labelledby="author-connect-heading"
            className="mt-10 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <h2
              id="author-connect-heading"
              className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Follow {profile.displayName.split(' ')[0]}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <AuthorSocialLinks
                links={profile.socialLinks}
                authorName={profile.displayName}
                variant="text"
                size="sm"
                onLinkClick={(platform, href) => {
                  trackEvent('author_social_click', {
                    author_username: profile.username,
                    platform,
                    source: 'author_profile_footer',
                  });
                  void href;
                }}
              />
              {profile.contactEmail ? (
                <a
                  href={`mailto:${profile.contactEmail}`}
                  onClick={handleEmailClick}
                  aria-label={`Email ${profile.displayName}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:text-emerald-400 dark:focus-visible:ring-offset-slate-900"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email author
                </a>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small local UI                                                             */
/* -------------------------------------------------------------------------- */

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950',
        active
          ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600'
          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-400',
      )}
    >
      {children}
    </button>
  );
}
