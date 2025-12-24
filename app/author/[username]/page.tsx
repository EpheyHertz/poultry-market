import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PublicAuthorProfile from './public-author-profile';

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  
  const profile = await prisma.authorProfile.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      user: {
        select: {
          name: true,
          avatar: true
        }
      }
    }
  });

  if (!profile || !profile.isPublic) {
    return {
      title: 'Author Not Found',
    };
  }

  const title = `${profile.displayName} - Author Profile`;
  const description = profile.bio || `Read articles by ${profile.displayName} on PoultryMarket Kenya`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: profile.avatarUrl ? [{ url: profile.avatarUrl }] : [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: profile.avatarUrl ? [profile.avatarUrl] : [],
    },
  };
}

export default async function PublicAuthorPage({ params }: PageProps) {
  const { username } = await params;
  
  const profile = await prisma.authorProfile.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: {
              followers: true,
              following: true
            }
          }
        }
      },
      // Include wallet to check if support is enabled
      wallet: {
        select: {
          id: true,
          status: true,
        }
      },
      blogPosts: {
        where: {
          status: 'PUBLISHED'
        },
        orderBy: {
          publishedAt: 'desc'
        },
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
          author: {
            select: {
              id: true,
              name: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          _count: {
            select: {
              likedBy: true,
              comments: true
            }
          }
        }
      }
    }
  });

  if (!profile || !profile.isPublic) {
    notFound();
  }

  // Build social links object from individual fields
  const socialLinks = {
    twitter: profile.twitterHandle || undefined,
    linkedin: profile.linkedinUrl || undefined,
    facebook: profile.facebookUrl || undefined,
    instagram: profile.instagramHandle || undefined,
    github: profile.githubUsername || undefined,
    youtube: profile.youtubeChannel || undefined,
  };

  // Filter out undefined values for sameAs
  const sameAsLinks = Object.values(socialLinks).filter((link): link is string => Boolean(link));

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: profile.displayName,
      url: `https://poultrymarketke.vercel.app/author/${profile.username}`,
      image: profile.avatarUrl,
      description: profile.bio,
      jobTitle: profile.occupation,
      worksFor: profile.company ? {
        '@type': 'Organization',
        name: profile.company
      } : undefined,
      address: profile.location ? {
        '@type': 'PostalAddress',
        addressLocality: profile.location
      } : undefined,
      sameAs: sameAsLinks.length > 0 ? sameAsLinks : undefined
    }
  };

  // Transform profile to match component interface
  // Check if support is enabled (wallet exists and is active)
  const supportEnabled = profile.wallet?.status === 'ACTIVE';
  
  const transformedProfile = {
    id: profile.id,
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio || undefined,
    tagline: profile.tagline || undefined,
    avatarUrl: profile.avatarUrl || undefined,
    coverImageUrl: profile.coverImageUrl || undefined,
    website: profile.website || undefined,
    location: profile.location || undefined,
    occupation: profile.occupation || undefined,
    company: profile.company || undefined,
    expertise: profile.expertise || [],
    socialLinks,
    isVerified: profile.isVerified,
    totalPosts: profile.totalPosts,
    totalViews: profile.totalViews,
    totalLikes: profile.totalLikes,
    createdAt: profile.createdAt.toISOString(),
    supportEnabled, // Add support status
    user: {
      id: profile.user.id,
      name: profile.user.name,
      avatar: profile.user.avatar || undefined,
      createdAt: profile.user.createdAt.toISOString(),
      _count: profile.user._count
    },
    blogPosts: profile.blogPosts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || undefined,
      featuredImage: post.featuredImage || undefined,
      category: post.category,
      readingTime: post.readingTime || undefined,
      viewCount: post.viewCount,
      publishedAt: post.publishedAt?.toISOString() || new Date().toISOString(),
      authorId: post.author.id,
      authorName: post.author.name,
      authorUsername: profile.username, // Use profile username for all posts
      tags: post.tags.map(t => ({
        tag: {
          id: t.tag.id,
          name: t.tag.name,
          slug: t.tag.slug
        }
      })),
      _count: post._count
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicAuthorProfile profile={transformedProfile} />
    </>
  );
}
