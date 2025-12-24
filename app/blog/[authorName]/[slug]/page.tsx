import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PublicNavbar from '@/components/layout/public-navbar';
import MobileBlogPost from './mobile-blog-post';

export const dynamic = 'force-dynamic';

interface Params {
  authorName: string;
  slug: string;
}

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

  // Use AuthorProfile displayName/username if available
  const authorDisplayName = post.authorDisplayName || post.author.name;
  const authorUsername = post.authorUsername || resolvedParams.authorName;
  const canonicalAuthorPath = post.authorUsername || resolvedParams.authorName;
  
  return {
    title: `${post.title} | ${authorDisplayName} | Poultry Market Kenya Connect`,
    description: post.metaDescription || post.excerpt || `Read ${post.title} by ${authorDisplayName} on Poultry Market Kenya Connect`,
    keywords: post.metaKeywords,
    authors: [{ name: authorDisplayName }],
    openGraph: {
      title: post.ogTitle || post.title,
      description: post.ogDescription || post.metaDescription || post.excerpt || '',
      images: post.ogImage || post.featuredImage ? [
        {
          url: post.ogImage || post.featuredImage || '',
          width: 1200,
          height: 630,
          alt: post.title,
        }
      ] : [],
      type: 'article',
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date(post.createdAt).toISOString(),
      authors: [authorDisplayName],
      url: `https://poultrymarketke.vercel.app/blog/${canonicalAuthorPath}/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.twitterTitle || post.title,
      description: post.twitterDescription || post.metaDescription || post.excerpt || '',
      images: post.twitterImage || post.featuredImage ? [(post.twitterImage || post.featuredImage) as string] : [],
    },
    robots: {
      index: post.status === 'PUBLISHED',
      follow: post.status === 'PUBLISHED',
    },
    alternates: {
      canonical: `https://poultrymarketke.vercel.app/blog/${canonicalAuthorPath}/${post.slug}`,
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

  // Generate structured data for SEO
  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.metaDescription || '',
    image: post.featuredImage || '',
    author: {
      '@type': 'Person',
      name: authorDisplayName,
      url: `https://poultrymarketke.vercel.app${authorProfileUrl}`,
      image: authorAvatarUrl || undefined,
      description: authorBio || undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: 'PoultryMarket Kenya',
      logo: {
        '@type': 'ImageObject',
        url: 'https://res.cloudinary.com/dgvslio7u/image/upload/v1734690503/poultry-marketplace/logo_hd2q5e.png',
      },
    },
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date(post.createdAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://poultrymarketke.vercel.app/blog/${authorUsername}/${post.slug}`,
    },
    keywords: post.tags.map(t => t.tag.name).join(', '),
    articleSection: post.category,
    wordCount: post.content.split(/\s+/).length,
    timeRequired: post.readingTime ? `PT${post.readingTime}M` : undefined,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ReadAction',
        userInteractionCount: post.viewCount,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post._count?.likedBy || 0,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post._count?.comments || 0,
      },
    ],
  };

  // Person schema for author
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: authorDisplayName,
    url: `https://poultrymarketke.vercel.app${authorProfileUrl}`,
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
        item: 'https://poultrymarketke.vercel.app',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://poultrymarketke.vercel.app/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: authorDisplayName,
        item: `https://poultrymarketke.vercel.app${authorProfileUrl}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: post.title,
        item: `https://poultrymarketke.vercel.app/blog/${authorUsername}/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
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
