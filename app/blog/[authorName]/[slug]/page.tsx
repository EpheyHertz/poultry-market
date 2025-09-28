import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PublicNavbar from '@/components/layout/public-navbar';
import MobileBlogPost from './mobile-blog-post';

interface Props {
  params: Promise<{
    authorName: string;
    slug: string;
  }>;
}

async function getBlogPost(authorName: string, slug: string) {
  try {
    // First, find the author by name
    const author = await prisma.user.findFirst({
      where: {
        name: {
          equals: authorName.replace(/-/g, ' '),
          mode: 'insensitive'
        }
      }
    });

    if (!author) {
      return null;
    }

    // Then find the blog post by slug and author
    const post = await prisma.blogPost.findFirst({
      where: { 
        slug,
        authorId: author.id
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

    return post;
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.authorName, resolvedParams.slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The blog post you are looking for does not exist.',
    };
  }

  const authorName = resolvedParams.authorName;
  
  return {
    title: `${post.title} | ${resolvedParams.authorName.replace(/-/g, ' ')} | Poultry Market Kenya Connect`,
    description: post.metaDescription || post.excerpt || `Read ${post.title} by ${resolvedParams.authorName.replace(/-/g, ' ')} on Poultry Market Kenya Connect`,
    keywords: post.metaKeywords,
    authors: [{ name: resolvedParams.authorName.replace(/-/g, ' ') }],
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
      authors: [resolvedParams.authorName.replace(/-/g, ' ')],
      url: `https://poultrymarketke.vercel.app/blog/${authorName}/${post.slug}`,
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
      canonical: `https://poultrymarketke.vercel.app/blog/${authorName}/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
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

  return (
    <>
      <PublicNavbar />
      <MobileBlogPost post={post} relatedPosts={relatedPosts} />
    </>
  );
}

// Generate static paths for published blog posts
export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED'
      },
      include: {
        author: {
          select: {
            name: true
          }
        }
      },
      take: 100 // Limit for build performance
    });

    return posts.map((post) => ({
      authorName: post.author.name.replace(/\s+/g, '-').toLowerCase(),
      slug: post.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}