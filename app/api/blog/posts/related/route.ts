import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exclude = searchParams.get('exclude');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const limit = parseInt(searchParams.get('limit') || '3');

    if (!exclude) {
      return NextResponse.json(
        { error: 'Post ID to exclude is required' },
        { status: 400 }
      );
    }

    // Build the where clause for related posts
    const whereClause: any = {
      id: { not: exclude },
      status: 'PUBLISHED',
    };

    // Create an OR condition for related content
    const orConditions: any[] = [];

    // Same category
    if (category) {
      orConditions.push({ category });
    }

    // Similar tags
    if (tags.length > 0) {
      orConditions.push({
        tags: {
          some: {
            tag: {
              slug: { in: tags }
            }
          }
        }
      });
    }

    // If we have related conditions, use them; otherwise get recent posts
    if (orConditions.length > 0) {
      whereClause.OR = orConditions;
    }

    const relatedPosts = await prisma.blogPost.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        readingTime: true,
        publishedAt: true,
        category: true,
        views: true,
        likes: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: [
        { publishedAt: 'desc' },
        { views: 'desc' },
      ],
      take: limit * 2, // Get more to have better selection
    });

    // Transform the data
    const transformedPosts = relatedPosts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      readingTime: post.readingTime,
      publishedAt: post.publishedAt?.toISOString() || '',
      category: post.category,
      views: post.views,
      likes: post.likes,
      author: {
        id: post.author.id,
        name: post.author.name,
        avatar: post.author.avatar,
      },
      tags: post.tags.map((tagRelation) => tagRelation.tag),
    }));

    // If we don't have enough related posts, get recent ones
    let finalPosts = transformedPosts;
    if (finalPosts.length < limit) {
      const recentPosts = await prisma.blogPost.findMany({
        where: {
          id: { not: exclude },
          status: 'PUBLISHED',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          readingTime: true,
          publishedAt: true,
          category: true,
          views: true,
          likes: true,
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
        ],
        take: limit,
      });

      const transformedRecentPosts = recentPosts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        featuredImage: post.featuredImage,
        readingTime: post.readingTime,
        publishedAt: post.publishedAt?.toISOString() || '',
        category: post.category,
        views: post.views,
        likes: post.likes,
        author: {
          id: post.author.id,
          name: post.author.name,
          avatar: post.author.avatar,
        },
        tags: post.tags.map((tagRelation) => tagRelation.tag),
      }));

      // Combine and deduplicate
      const combinedPosts = [...finalPosts, ...transformedRecentPosts];
      const uniquePosts = combinedPosts.filter(
        (post, index, self) => 
          index === self.findIndex((p) => p.id === post.id)
      );
      
      finalPosts = uniquePosts.slice(0, limit);
    } else {
      finalPosts = finalPosts.slice(0, limit);
    }

    return NextResponse.json({
      posts: finalPosts,
      total: finalPosts.length,
    });

  } catch (error) {
    console.error('Error fetching related posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related posts' },
      { status: 500 }
    );
  }
}