import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { prisma } from '@/lib/prisma';
import { SITE_URL, seoConfig } from '@/lib/seo';
import {
  buildAuthorSocialLinks,
  buildProfessionalTitle,
  formatJoinedLabel,
  getAuthorProfileHref,
  resolveAuthorContactEmail,
} from '@/lib/author-profile';
import { toAuthorResourceView } from '@/lib/author-resources';

import PublicAuthorProfile, { type PublicAuthorProfileData } from './public-author-profile';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ username: string }>;
}

/**
 * Single query used by both `generateMetadata` and the page render.
 * `cache()` de-duplicates it within one request so the profile is only
 * fetched once (§30 performance).
 */
const getAuthorProfile = cache(async (username: string) => {
  return prisma.authorProfile.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true,
          _count: { select: { followers: true } },
        },
      },
      // Wallet presence controls whether "Support author" is offered.
      wallet: { select: { id: true, status: true } },
      // Recommended / affiliate resources. Read from stored columns only —
      // a public render never fetches a merchant URL (ext §24).
      resources: {
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
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
      blogPosts: {
        // Drafts / pending / archived posts are never exposed publicly (§12).
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          category: true,
          readingTime: true,
          viewCount: true,
          publishedAt: true,
          author: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
          _count: { select: { likedBy: true, comments: true } },
        },
      },
    },
  });
});

/** Trim a bio into a clean meta description without cutting words in half. */
function toMetaDescription(text: string, limit = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\-–—]$/, '')}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getAuthorProfile(username);

  if (!profile || !profile.isPublic) {
    return {
      title: 'Author not found',
      robots: { index: false, follow: false },
    };
  }

  const professionalTitle =
    buildProfessionalTitle(profile.occupation, profile.company) || profile.tagline || null;

  // Unique per-author title/description — never a shared template (§20).
  const title = professionalTitle
    ? `${profile.displayName} — ${professionalTitle} | ${seoConfig.siteName}`
    : `${profile.displayName} — Author | ${seoConfig.siteName}`;

  const descriptionSource =
    (profile.bio && profile.bio.trim()) ||
    (profile.tagline && profile.tagline.trim()) ||
    [
      professionalTitle,
      profile.expertise.length ? `Writes about ${profile.expertise.slice(0, 3).join(', ')}.` : null,
      `Read ${profile.totalPosts || profile.blogPosts.length} published articles on ${seoConfig.siteName}.`,
    ]
      .filter(Boolean)
      .join(' ');

  const description = toMetaDescription(descriptionSource);
  const canonical = `${SITE_URL}${getAuthorProfileHref(profile.username) ?? `/author/${profile.username}`}`;
  const image = profile.avatarUrl || profile.user.avatar || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'profile',
      url: canonical,
      siteName: seoConfig.siteName,
      images: image ? [{ url: image, alt: `${profile.displayName} profile photo` }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicAuthorPage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getAuthorProfile(username);

  if (!profile || !profile.isPublic) {
    notFound();
  }

  const profileHref = getAuthorProfileHref(profile.username) ?? `/author/${profile.username}`;
  const canonical = `${SITE_URL}${profileHref}`;

  // Shared helpers guarantee identical, validated output on every surface (§34).
  const socialLinks = buildAuthorSocialLinks({
    facebookUrl: profile.facebookUrl,
    instagramHandle: profile.instagramHandle,
    twitterHandle: profile.twitterHandle,
    linkedinUrl: profile.linkedinUrl,
    youtubeChannel: profile.youtubeChannel,
    githubUsername: profile.githubUsername,
    website: profile.website,
  });

  // The account email is only ever surfaced when the author opted in (§3).
  const contactEmail = resolveAuthorContactEmail({
    showEmail: profile.showEmail,
    email: profile.user.email,
  });

  const professionalTitle =
    buildProfessionalTitle(profile.occupation, profile.company) || profile.tagline || null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${canonical}#profile`,
        url: canonical,
        name: `${profile.displayName} — ${seoConfig.siteName}`,
        mainEntity: { '@id': `${canonical}#person` },
      },
      {
        '@type': 'Person',
        '@id': `${canonical}#person`,
        name: profile.displayName,
        url: canonical,
        ...(profile.avatarUrl ? { image: profile.avatarUrl } : {}),
        ...(profile.bio ? { description: profile.bio } : {}),
        ...(profile.occupation ? { jobTitle: profile.occupation } : {}),
        ...(profile.company
          ? { worksFor: { '@type': 'Organization', name: profile.company } }
          : {}),
        ...(profile.location
          ? { address: { '@type': 'PostalAddress', addressLocality: profile.location } }
          : {}),
        ...(profile.expertise.length ? { knowsAbout: profile.expertise } : {}),
        ...(socialLinks.length ? { sameAs: socialLinks.map((link) => link.href) } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: profile.displayName, item: canonical },
        ],
      },
    ],
  };

  const data: PublicAuthorProfileData = {
    id: profile.id,
    userId: profile.user.id,
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    tagline: profile.tagline,
    professionalTitle,
    avatarUrl: profile.avatarUrl || profile.user.avatar,
    coverImageUrl: profile.coverImageUrl,
    location: profile.location,
    expertise: profile.expertise ?? [],
    isVerified: profile.isVerified,
    socialLinks,
    contactEmail,
    joinedLabel: formatJoinedLabel(profile.createdAt),
    stats: {
      posts: profile.totalPosts,
      views: profile.totalViews,
      likes: profile.totalLikes,
      followers: profile.user._count.followers,
    },
    supportEnabled: profile.wallet?.status === 'ACTIVE',
    // Already filtered to active rows by the query; mapped through the shared
    // view helper so every surface renders the same shape (ext §26).
    resources: profile.resources.map(toAuthorResourceView),
    posts: profile.blogPosts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      category: post.category,
      readingTime: post.readingTime,
      viewCount: post.viewCount,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      authorId: post.author.id,
      authorName: post.author.name,
      tags: post.tags.map((entry) => ({
        id: entry.tag.id,
        name: entry.tag.name,
        slug: entry.tag.slug,
      })),
      likes: post._count.likedBy,
      comments: post._count.comments,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicAuthorProfile profile={data} />
    </>
  );
}
