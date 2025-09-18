import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const likeSchema = z.object({
  slug: z.string().min(1)
});

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the slug from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const slug = pathParts[pathParts.length - 2] || ''; // Get slug (second to last part)

    // Find the blog post
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true, status: true }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Only allow likes on published posts
    if (post.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Cannot like unpublished posts' },
        { status: 400 }
      );
    }

    // Check if the user has already liked this post
    const existingLike = await prisma.blogPostLike.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: post.id
        }
      }
    });

    if (existingLike) {
      // Unlike the post
      await prisma.$transaction([
        prisma.blogPostLike.delete({
          where: { id: existingLike.id }
        }),
        prisma.blogPost.update({
          where: { id: post.id },
          data: { likes: { decrement: 1 } }
        })
      ]);

      // Get updated like count
      const updatedPost = await prisma.blogPost.findUnique({
        where: { id: post.id },
        select: { likes: true }
      });

      return NextResponse.json({
        liked: false,
        likes: updatedPost?.likes || 0
      });
    } else {
      // Like the post
      await prisma.$transaction([
        prisma.blogPostLike.create({
          data: {
            userId: user.id,
            postId: post.id
          }
        }),
        prisma.blogPost.update({
          where: { id: post.id },
          data: { likes: { increment: 1 } }
        })
      ]);

      // Get updated like count
      const updatedPost = await prisma.blogPost.findUnique({
        where: { id: post.id },
        select: { likes: true }
      });

      return NextResponse.json({
        liked: true,
        likes: updatedPost?.likes || 0
      });
    }
  } catch (error) {
    console.error('Error toggling blog post like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();
    
    // Get the slug from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const slug = pathParts[pathParts.length - 2] || ''; // Get slug (second to last part)

    // Find the blog post
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { 
        id: true, 
        likes: true,
        likedBy: user?.id ? {
          where: { userId: user.id },
          select: { id: true }
        } : false
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const isLiked = user?.id ? 
      Array.isArray(post.likedBy) && post.likedBy.length > 0 : false;

    return NextResponse.json({
      liked: isLiked,
      likes: post.likes
    });
  } catch (error) {
    console.error('Error getting blog post likes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}