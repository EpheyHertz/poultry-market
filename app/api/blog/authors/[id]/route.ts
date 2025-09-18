import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const authorSchema = z.object({
  id: z.string().min(1)
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the author ID from params
    const resolvedParams = await params;
    const { id: authorId } = authorSchema.parse(resolvedParams);

    // Find the author with their blog posts and stats
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            blogPosts: {
              where: {
                status: 'PUBLISHED'
              }
            },
            followers: true,
            following: true
          }
        },
        blogPosts: {
          where: {
            status: 'PUBLISHED'
          },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            featuredImage: true,
            category: true,
            viewCount: true,
            likes: true,
            publishedAt: true,
            comments: {
              where: {
                isApproved: true
              },
              select: {
                id: true
              }
            }
          },
          orderBy: {
            publishedAt: 'desc'
          }
        }
      }
    });

    if (!author) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedAuthor = {
      ...author,
      _count: {
        posts: author._count.blogPosts,
        followers: author._count.followers,
        following: author._count.following
      },
      posts: author.blogPosts.map(post => ({
        ...post,
        publishedAt: post.publishedAt?.toISOString() || new Date().toISOString()
      })),
      createdAt: author.createdAt.toISOString()
    };

    return NextResponse.json(formattedAuthor);
  } catch (error) {
    console.error('Error fetching author profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}