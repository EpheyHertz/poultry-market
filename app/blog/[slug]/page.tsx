import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PublicNavbar from '@/components/layout/public-navbar';
import MobileBlogPost from './mobile-blog-post';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

async function getBlogPost(slug: string) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
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
              },
              orderBy: {
                createdAt: 'asc'
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

    // Check if post should be visible (only published posts for public access)
    if (post.status !== 'PUBLISHED') {
      return null;
    }

    // Increment view count for published posts
    await prisma.blogPost.update({
      where: { slug },
      data: { viewCount: { increment: 1 } }
    });

    // Get related posts (same category, excluding current post)
    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        category: post.category,
        status: 'PUBLISHED',
        id: { not: post.id }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: 3
    });

    return {
      ...post,
      _count: {
        likes: post._count.likedBy,
        comments: post._count.comments
      },
      tags: post.tags.map(t => t.tag),
      relatedPosts: relatedPosts.map(p => ({
        ...p,
        tags: p.tags.map(t => t.tag)
      }))
    };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.slug);

  if (!post) {
    return {
      title: 'Post Not Found - Poultry Blog',
      description: 'The blog post you are looking for could not be found.'
    };
  }

  return {
    title: `${post.title} - Poultry Blog`,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      images: post.featuredImage ? [post.featuredImage] : [],
      type: 'article',
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      authors: [post.author.name],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || post.title,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <MobileBlogPost params={params} />
    </div>
  );
}
