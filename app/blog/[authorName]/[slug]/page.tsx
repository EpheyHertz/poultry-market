/**
 * Article page — server component (§1, §25, §26, §28).
 *
 * Responsibilities are deliberately narrow:
 *   1. Resolve the post (one cached query shared with `generateMetadata`).
 *   2. Map the Prisma row onto the small `ArticleView` view-model.
 *   3. Derive headings (§6), reading time (§14) and recommendations (§15–§17).
 *   4. Emit SEO metadata + structured data (§25).
 *   5. Hand everything to <ArticleShell /> — all layout/interaction lives there.
 *
 * Note: this page NEVER increments the view counter. Views are recorded by the
 * client only after meaningful engagement (§12) via
 * `POST /api/blog/posts/by-id/[postId]/view`.
 */

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import AdsenseScript from '@/components/ads';
import ArticleShell from '@/components/blog/article/article-shell';
import PublicNavbar from '@/components/layout/public-navbar';
import {
  buildAuthorSocialLinks,
  buildProfessionalTitle,
  getAuthorProfileHref,
  resolveAuthorContactEmail,
} from '@/lib/author-profile';
import { buildExcerpt, extractHeadings, resolveReadingTime } from '@/lib/blog/article/content';
import { hasMeaningfulUpdate, toIsoDate } from '@/lib/blog/article/format';
import { getRecommendations } from '@/lib/blog/article/recommendations';
import type { ArticleView } from '@/lib/blog/article/types';
import { toAuthorResourceView } from '@/lib/author-resources';
import { prisma } from '@/lib/prisma';
import { seoConfig, SITE_URL } from '@/lib/seo';
import { BLOG_CATEGORIES } from '@/types/blog';

export const dynamic = 'force-dynamic';

interface Params {
  authorName: string;
  slug: string;
}

const BRAND_NAME = 'PoultryMarket';
const MAX_DESCRIPTION_LENGTH = 160;

/** Statuses a signed-out reader may see (mirrors the rest of the blog stack). */
const PUBLIC_STATUSES = ['PUBLISHED', 'APPROVED'] as const;

const buildDescription = (value?: string | null) => {
  const cleaned = (value ?? '').replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return `Read this article on ${BRAND_NAME}.`;
  }

  return cleaned.length > MAX_DESCRIPTION_LENGTH
    ? `${cleaned.slice(0, MAX_DESCRIPTION_LENGTH - 3).trimEnd()}...`
    : cleaned;
};

const toAbsoluteUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${SITE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};

/** URL-safe author segment used when an author has no `authorProfile.username`. */
const slugifyAuthorName = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const POST_SELECT = {
  id: true,
  slug: true,
  title: true,
  content: true,
  excerpt: true,
  category: true,
  status: true,
  featuredImage: true,
  images: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  likes: true,
  readingTime: true,
  estimatedReadTime: true,
  tagNames: true,
  authorId: true,
  authorProfileId: true,
  metaDescription: true,
  metaKeywords: true,
  ogTitle: true,
  ogDescription: true,
  ogImage: true,
  twitterTitle: true,
  twitterDescription: true,
  twitterImage: true,
  canonicalUrl: true,
  author: {
    select: {
      id: true,
      name: true,
      // Account email: only ever used behind the author's `showEmail` opt-in.
      email: true,
      avatar: true,
      bio: true,
      _count: { select: { blogPosts: true, followers: true } },
    },
  },
  authorProfile: {
    select: {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      bio: true,
      tagline: true,
      website: true,
      location: true,
      occupation: true,
      company: true,
      showEmail: true,
      twitterHandle: true,
      linkedinUrl: true,
      facebookUrl: true,
      instagramHandle: true,
      youtubeChannel: true,
      githubUsername: true,
      isVerified: true,
      totalPosts: true,
      // ext §12: we only need to know *whether* the author has any public
      // recommendations, so the author card can offer a link instead of a grid.
      resources: { where: { isActive: true }, select: { id: true }, take: 1 },
    },
  },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
  /**
   * Resources the author deliberately attached to *this* article (ext §13 — a
   * real relation, not ids in a text column). Stored metadata only: rendering a
   * public page never touches the merchant (ext §24).
   */
  resourceLinks: {
    where: { resource: { isActive: true } },
    orderBy: { resource: { displayOrder: 'asc' } },
    select: {
      resource: {
        select: {
          id: true,
          title: true,
          description: true,
          url: true,
          domain: true,
          merchant: true,
          imageUrl: true,
          isAffiliate: true,
          affiliateDisclosure: true,
          isActive: true,
          displayOrder: true,
        },
      },
    },
  },
  _count: { select: { likedBy: true, comments: true } },
} as const;

type PostRecord = NonNullable<Awaited<ReturnType<typeof queryPost>>>;

async function queryPost(authorName: string, slug: string) {
  // 1. Author-scoped lookup (the canonical path) — keeps two authors from
  //    colliding on an identical slug.
  const username = authorName.toLowerCase();
  const profile = await prisma.authorProfile.findUnique({
    where: { username },
    select: { id: true, userId: true },
  });

  const legacyUser = profile
    ? null
    : await prisma.user.findFirst({
      where: { name: { equals: authorName.replace(/-/g, ' '), mode: 'insensitive' } },
      select: { id: true },
    });

  const ownerIds = [profile?.userId, legacyUser?.id].filter(Boolean) as string[];

  if (profile || ownerIds.length) {
    const scoped = await prisma.blogPost.findFirst({
      where: {
        slug,
        status: { in: [...PUBLIC_STATUSES] },
        OR: [
          ...(profile ? [{ authorProfileId: profile.id }] : []),
          ...(ownerIds.length ? [{ authorId: { in: ownerIds } }] : []),
        ],
      },
      select: POST_SELECT,
    });

    if (scoped) {
      return scoped;
    }
  }

  // 2. Fallback: the slug alone. Legacy/mis-typed author segments still resolve,
  //    and the page then redirects to the canonical URL (§25).
  return prisma.blogPost.findFirst({
    where: { slug, status: { in: [...PUBLIC_STATUSES] } },
    select: POST_SELECT,
  });
}

/**
 * Cached per request: `generateMetadata` and the page body share a single
 * database round-trip instead of querying (and previously incrementing) twice.
 */
const getPost = cache(async (authorName: string, slug: string) => {
  try {
    return await queryPost(authorName, slug);
  } catch (error) {
    console.error('[article] failed to load post:', error);
    return null;
  }
});

/** Canonical `/blog/{author}/{slug}` segment for a post. */
function canonicalAuthorSegment(post: PostRecord, fallback: string) {
  return post.authorProfile?.username || slugifyAuthorName(post.author?.name ?? '') || fallback;
}

/** Prisma row → serialisable view-model consumed by every client component. */
function toArticleView(post: PostRecord, authorSegment: string): ArticleView {
  const categoryKey = String(post.category ?? '') as keyof typeof BLOG_CATEGORIES;
  const categoryMeta = BLOG_CATEGORIES[categoryKey];
  const publishedAt = toIsoDate(post.publishedAt ?? post.createdAt);
  const updatedAt = toIsoDate(post.updatedAt);
  const href = `/blog/${authorSegment}/${post.slug}`;

  const displayName = post.authorProfile?.displayName || post.author?.name || 'PoultryMarket';
  const username = post.authorProfile?.username ?? null;

  // Same helpers as the author profile page → one source of truth (§34) and a
  // single place where author-supplied URLs are validated (§33).
  const socialLinks = buildAuthorSocialLinks({
    facebookUrl: post.authorProfile?.facebookUrl,
    instagramHandle: post.authorProfile?.instagramHandle,
    twitterHandle: post.authorProfile?.twitterHandle,
    linkedinUrl: post.authorProfile?.linkedinUrl,
    youtubeChannel: post.authorProfile?.youtubeChannel,
    githubUsername: post.authorProfile?.githubUsername,
    website: post.authorProfile?.website,
  });

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    content: post.content ?? '',
    excerpt: post.excerpt?.trim() || buildExcerpt(post.content) || null,
    category: String(post.category ?? ''),
    categoryLabel: categoryMeta?.name || String(post.category ?? 'Article').replace(/_/g, ' '),
    categoryIcon: categoryMeta?.icon ?? null,
    categoryHref: `/blog?category=${encodeURIComponent(String(post.category ?? ''))}`,
    featuredImage: post.featuredImage || post.images?.[0] || null,
    publishedAt,
    updatedAt,
    showUpdatedAt: hasMeaningfulUpdate(post.publishedAt ?? post.createdAt, post.updatedAt),
    // §14 — always derived from the real body, never a hardcoded number.
    readingTime: resolveReadingTime(post.content, post.readingTime ?? post.estimatedReadTime),
    views: post.viewCount ?? 0,
    likes: post._count?.likedBy ?? post.likes ?? 0,
    commentCount: post._count?.comments ?? 0,
    tags: (post.tags ?? []).map((entry) => ({
      id: entry.tag.id,
      name: entry.tag.name,
      slug: entry.tag.slug,
    })),
    author: {
      id: post.author?.id ?? post.authorId,
      profileId: post.authorProfile?.id ?? null,
      name: displayName,
      username,
      avatarUrl: post.authorProfile?.avatarUrl || post.author?.avatar || null,
      bio: post.authorProfile?.bio || post.author?.bio || null,
      tagline: post.authorProfile?.tagline ?? null,
      professionalTitle:
        buildProfessionalTitle(post.authorProfile?.occupation, post.authorProfile?.company) ||
        post.authorProfile?.tagline ||
        null,
      isVerified: Boolean(post.authorProfile?.isVerified),
      followers: post.author?._count?.followers ?? 0,
      posts: post.authorProfile?.totalPosts ?? post.author?._count?.blogPosts ?? 0,
      href: getAuthorProfileHref(username),
      socialLinks,
      // Private account emails are never exposed without an explicit opt-in (§3).
      contactEmail: resolveAuthorContactEmail({
        showEmail: post.authorProfile?.showEmail,
        email: post.author?.email,
      }),
      // ext §12 — the author card links to the profile section instead of
      // repeating a full recommendation grid inside the article.
      hasResources: (post.authorProfile?.resources?.length ?? 0) > 0,
    },
    // ext §13 — only resources explicitly attached to this article.
    resources: (post.resourceLinks ?? []).map((link) => toAuthorResourceView(link.resource)),
    canonicalUrl: toAbsoluteUrl(post.canonicalUrl) || `${SITE_URL}${href}`,
    href,
  };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.authorName, resolvedParams.slug);

  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The blog post you are looking for does not exist.',
    };
  }

  const authorSegment = canonicalAuthorSegment(post, resolvedParams.authorName);
  const authorDisplayName = post.authorProfile?.displayName || post.author?.name || BRAND_NAME;
  const canonicalUrl =
    toAbsoluteUrl(post.canonicalUrl) || `${SITE_URL}/blog/${authorSegment}/${post.slug}`;
  const description = buildDescription(
    post.metaDescription || post.excerpt || post.ogDescription || buildExcerpt(post.content),
  );
  const imageUrl =
    toAbsoluteUrl(post.ogImage) ||
    toAbsoluteUrl(post.featuredImage) ||
    toAbsoluteUrl(post.twitterImage) ||
    seoConfig.images?.[0]?.url ||
    null;
  const publishedTime = toIsoDate(post.publishedAt ?? post.createdAt) ?? undefined;
  const modifiedTime = toIsoDate(post.updatedAt) ?? publishedTime;

  return {
    title: `${post.title} | ${BRAND_NAME}`,
    description,
    keywords: post.metaKeywords,
    authors: [{ name: authorDisplayName }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.ogTitle || `${post.title} | ${BRAND_NAME}`,
      description: buildDescription(post.ogDescription || description),
      type: 'article',
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      publishedTime,
      modifiedTime,
      authors: [authorDisplayName],
      section: BLOG_CATEGORIES[String(post.category ?? '') as keyof typeof BLOG_CATEGORIES]?.name,
      images: imageUrl
        ? [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ]
        : seoConfig.images,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.twitterTitle || `${post.title} | ${BRAND_NAME}`,
      description: buildDescription(post.twitterDescription || description),
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.authorName, resolvedParams.slug);

  if (!post) {
    notFound();
  }

  const authorSegment = canonicalAuthorSegment(post, resolvedParams.authorName);

  // Stable URLs (§25): a legacy or mistyped author segment permanently resolves
  // to the canonical one instead of serving duplicate content.
  if (authorSegment.toLowerCase() !== resolvedParams.authorName.toLowerCase()) {
    redirect(`/blog/${authorSegment}/${post.slug}`);
  }

  const article = toArticleView(post, authorSegment);

  // §6 — the TOC is generated from the article's own headings, never curated.
  const headings = extractHeadings(article.content);

  // §15/§16/§29 — scored, de-duplicated and guaranteed to exclude this article.
  const recommendations = await getRecommendations(
    {
      id: article.id,
      slug: article.slug,
      title: article.title,
      category: article.category,
      tagNames: post.tagNames,
      authorId: article.author.id,
    },
    { sidebarCount: 4, bottomCount: 3, inArticleCount: 2 },
  );

  const description = buildDescription(
    post.metaDescription || article.excerpt || buildExcerpt(article.content),
  );
  const articleImage =
    toAbsoluteUrl(post.ogImage) ||
    toAbsoluteUrl(article.featuredImage) ||
    toAbsoluteUrl(post.twitterImage) ||
    seoConfig.images?.[0]?.url ||
    undefined;
  const authorUrl = article.author.href ? `${SITE_URL}${article.author.href}` : `${SITE_URL}/blog`;

  // §25 — one graph, no duplicated nodes: BlogPosting + Person + BreadcrumbList.
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${article.canonicalUrl}#article`,
        headline: article.title,
        description,
        image: articleImage ? [articleImage] : undefined,
        articleSection: article.categoryLabel,
        keywords: article.tags.length
          ? article.tags.map((tag) => tag.name).join(', ')
          : undefined,
        wordCount: article.content ? article.content.split(/\s+/).filter(Boolean).length : undefined,
        timeRequired: `PT${Math.max(1, article.readingTime)}M`,
        datePublished: article.publishedAt ?? undefined,
        dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
        inLanguage: 'en',
        author: { '@id': `${authorUrl}#person` },
        publisher: {
          '@type': 'Organization',
          name: seoConfig.siteName,
          logo: {
            '@type': 'ImageObject',
            url: seoConfig.images?.[0]?.url || `${SITE_URL}/images/logo.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': article.canonicalUrl,
        },
      },
      {
        '@type': 'Person',
        '@id': `${authorUrl}#person`,
        name: article.author.name,
        url: authorUrl,
        image: toAbsoluteUrl(article.author.avatarUrl) || undefined,
        description: article.author.bio || undefined,
        ...(article.author.professionalTitle
          ? { jobTitle: article.author.professionalTitle }
          : {}),
        // Validated links only — same list the UI renders.
        ...(article.author.socialLinks.length
          ? { sameAs: article.author.socialLinks.map((link) => link.href) }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${article.canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          {
            '@type': 'ListItem',
            position: 3,
            name: article.categoryLabel,
            item: `${SITE_URL}${article.categoryHref}`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: article.title,
            item: article.canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <AdsenseScript />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <PublicNavbar />
      <main className="min-h-screen bg-white dark:bg-gray-950">
        <ArticleShell
          article={article}
          headings={headings}
          sidebarRecommendations={recommendations.sidebar}
          bottomRecommendations={recommendations.bottom}
          inArticleRecommendations={recommendations.inArticle}
        />
      </main>
    </>
  );
}
