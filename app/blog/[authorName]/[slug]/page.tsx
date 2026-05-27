import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { seoConfig } from '@/lib/seo';
import PublicNavbar from '@/components/layout/public-navbar';
import MobileBlogPost from './mobile-blog-post';

export const dynamic = 'force-dynamic';

interface Params {
  authorName: string;
  slug: string;
}

const BRAND_NAME = 'PoultryMarket';
const MAX_DESCRIPTION_LENGTH = 160;

const buildDescription = (value?: string | null) => {
  const cleaned = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return `Read this article on ${BRAND_NAME}.`;
  }
  if (cleaned.length <= MAX_DESCRIPTION_LENGTH) {
    return cleaned;
  }
  return `${cleaned.slice(0, MAX_DESCRIPTION_LENGTH - 3).trimEnd()}...`;
};

const toAbsoluteUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return `${seoConfig.siteUrl}${value.startsWith('/') ? '' : '/'}${value}`;
};

async function getBlogPost(authorName: string, slug: string) {
  try {
    // Try to find by AuthorProfile username first (preferred)
    let authorProfile = await prisma.authorProfile.findUnique({
      where: {
        username: authorName.toLowerCase()
      },
      select: {
        id: true,
        userId: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        bio: true,
        tagline: true,
        website: true,
        location: true,
        twitterHandle: true,
        linkedinUrl: true,
        isVerified: true,
        totalPosts: true,
      }
    });

    let authorId: string | null = null;
    let authorProfileId: string | null = null;

    if (authorProfile) {
      // Found by username
      authorId = authorProfile.userId;
      authorProfileId = authorProfile.id;
    } else {
      // Fallback: find by User name (legacy support)
      const author = await prisma.user.findFirst({
        where: {
          name: {
            equals: authorName.replace(/-/g, ' '),
            mode: 'insensitive'
          }
        },
        include: {
          authorProfile: true
        }
      });

      if (!author) {
        return null;
      }

      authorId = author.id;
      authorProfileId = author.authorProfile?.id || null;
    }

    // Find the blog post by slug and author
    const post = await prisma.blogPost.findFirst({
      where: { 
        slug,
        OR: [
          { authorId: authorId },
          ...(authorProfileId ? [{ authorProfileId: authorProfileId }] : [])
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            bio: true,
            _count: {
              select: {
                blogPosts: true,
                followers: true,
                following: true
              }
            }
          }
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
            twitterHandle: true,
            linkedinUrl: true,
            isVerified: true,
            totalPosts: true,
            totalViews: true,
            totalLikes: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        },
        comments: {
          where: {
            isApproved: true,
            parentId: null // Only top-level comments
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            replies: {
              where: {
                isApproved: true
              },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            },
            _count: {
              select: {
                likedBy: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            likedBy: true,
            comments: true
          }
        }
      }
    });

    if (!post) {
      return null;
    }

    // Increment view count
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } }
    });

    // Transform to use AuthorProfile data preferentially
    const transformedPost = {
      ...post,
      // Add AuthorProfile fields for easy access
      authorProfileId: post.authorProfile?.id || null,
      authorUsername: post.authorProfile?.username || null,
      authorDisplayName: post.authorProfile?.displayName || post.author.name,
      authorAvatarUrl: post.authorProfile?.avatarUrl || post.author.avatar,
      authorBio: post.authorProfile?.bio || post.author.bio,
      authorIsVerified: post.authorProfile?.isVerified || false,
      // Override author object with combined data
      author: {
        ...post.author,
        displayName: post.authorProfile?.displayName || post.author.name,
        username: post.authorProfile?.username || null,
        avatarUrl: post.authorProfile?.avatarUrl || post.author.avatar,
        isVerified: post.authorProfile?.isVerified || false,
        tagline: post.authorProfile?.tagline || null,
        website: post.authorProfile?.website || null,
        location: post.authorProfile?.location || null,
        socialLinks: post.authorProfile ? {
          twitter: post.authorProfile.twitterHandle,
          linkedin: post.authorProfile.linkedinUrl,
        } : null,
      }
    };

    return transformedPost;
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

async function getRelatedPosts(postId: string, category: string, authorId: string, limit: number = 3) {
  try {
    return await prisma.blogPost.findMany({
      where: {
        AND: [
          { id: { not: postId } },
          { status: 'PUBLISHED' },
          {
            OR: [
              { category: category as any },
              { authorId }
            ]
          }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
            _count: {
              select: {
                blogPosts: true,
                followers: true
              }
            }
          }
        },
        authorProfile: {
          select: {
            displayName: true,
            username: true,
            avatarUrl: true,
            isVerified: true
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
      },
      orderBy: {
        viewCount: 'desc'
      },
      take: limit
    });
  } catch (error) {
    console.error('Error fetching related posts:', error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.authorName, resolvedParams.slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The blog post you are looking for does not exist.',
    };
  }

  const authorDisplayName = post.authorDisplayName || post.author.name;
  const canonicalAuthorPath = post.authorUsername || resolvedParams.authorName;
  const canonicalUrl = `${seoConfig.siteUrl}/blog/${canonicalAuthorPath}/${post.slug}`;
  const description = buildDescription(
    post.metaDescription || post.excerpt || post.ogDescription || ''
  );
  const imageUrl =
    toAbsoluteUrl(post.ogImage) ||
    toAbsoluteUrl(post.featuredImage) ||
    toAbsoluteUrl(post.twitterImage) ||
    seoConfig.images?.[0]?.url ||
    null;
  const publishedTime = post.publishedAt
    ? new Date(post.publishedAt).toISOString()
    : new Date(post.createdAt).toISOString();
  const modifiedTime = new Date(post.updatedAt).toISOString();

  return {
    title: `${post.title} | ${BRAND_NAME}`,
    description,
    keywords: post.metaKeywords,
    authors: [{ name: authorDisplayName }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${post.title} | ${BRAND_NAME}`,
      description,
      type: 'article',
      url: canonicalUrl,
      publishedTime,
      modifiedTime,
      authors: [authorDisplayName],
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
      title: `${post.title} | ${BRAND_NAME}`,
      description,
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
  const post = await getBlogPost(resolvedParams.authorName, resolvedParams.slug);

  if (!post) {
    notFound();
  }

  // Check if post is published (for public access)
  if (post.status !== 'PUBLISHED') {
    notFound();
  }

  // Fetch related posts
  const relatedPosts = await getRelatedPosts(post.id, post.category, post.authorId);

  // Transform related posts to include AuthorProfile data
  const transformedRelatedPosts = relatedPosts.map(rp => ({
    ...rp,
    authorUsername: rp.authorProfile?.username || null,
    authorDisplayName: rp.authorProfile?.displayName || rp.author.name,
    authorAvatarUrl: rp.authorProfile?.avatarUrl || rp.author.avatar,
    author: {
      ...rp.author,
      displayName: rp.authorProfile?.displayName || rp.author.name,
      username: rp.authorProfile?.username || null,
      avatarUrl: rp.authorProfile?.avatarUrl || rp.author.avatar,
      isVerified: rp.authorProfile?.isVerified || false,
    }
  }));

  // Use AuthorProfile data for SEO
  const authorDisplayName = post.authorDisplayName || post.author.name;
  const authorUsername = post.authorUsername || resolvedParams.authorName;
  const authorAvatarUrl = post.authorAvatarUrl || post.author.avatar;
  const authorBio = post.authorBio || post.author.bio;
  const authorProfileUrl = post.authorUsername 
    ? `/author/${post.authorUsername}` 
    : `/blog/author/${post.author.id}`;

  const canonicalUrl = `${seoConfig.siteUrl}/blog/${authorUsername}/${post.slug}`;
  const articleDescription = buildDescription(
    post.metaDescription || post.excerpt || ''
  );
  const articleImage =
    toAbsoluteUrl(post.ogImage) ||
    toAbsoluteUrl(post.featuredImage) ||
    toAbsoluteUrl(post.twitterImage) ||
    seoConfig.images?.[0]?.url ||
    undefined;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: articleDescription,
    image: articleImage ? [articleImage] : undefined,
    datePublished: post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : new Date(post.createdAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    author: {
      '@type': 'Person',
      name: authorDisplayName,
      url: `${seoConfig.siteUrl}${authorProfileUrl}`,
    },
    publisher: {
      '@type': 'Organization',
      name: seoConfig.siteName,
      logo: {
        '@type': 'ImageObject',
        url: seoConfig.images?.[0]?.url || `${seoConfig.siteUrl}/images/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  // Person schema for author
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: authorDisplayName,
    url: `${seoConfig.siteUrl}${authorProfileUrl}`,
    image: authorAvatarUrl || undefined,
    description: authorBio || undefined,
    sameAs: post.author.socialLinks ? [
      post.author.socialLinks.twitter ? `https://twitter.com/${post.author.socialLinks.twitter}` : null,
      post.author.socialLinks.linkedin || null,
    ].filter(Boolean) : [],
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: seoConfig.siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${seoConfig.siteUrl}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: authorDisplayName,
        item: `${seoConfig.siteUrl}${authorProfileUrl}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: post.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <PublicNavbar />
      <MobileBlogPost post={post} relatedPosts={transformedRelatedPosts} />
    </>
  );
}
