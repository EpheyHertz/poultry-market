import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const likeSchema = z.object({
  slug: z.string().min(1)
});

export async function GET(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();

    // Get the slug/ID from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const slugOrId = pathParts[pathParts.length - 2] || ''; // Get slug or ID (second to last part)

    // Determine if this is a CUID (ID) or a slug
    const isCuid = /^c[a-z0-9]{24}$/.test(slugOrId); // CUID pattern: starts with 'c' followed by 24 alphanumeric chars
    
    console.log('GET /api/blog/posts/[slug]/like called with:', slugOrId, 'isCuid:', isCuid);
    
    // Find the blog post by ID or slug
    const post = await prisma.blogPost.findUnique({
      where: isCuid ? { id: slugOrId } : { slug: slugOrId },
      select: { 
        id: true, 
        status: true,
        _count: {
          select: {
            likedBy: true
          }
        }
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    let liked = false;
    if (user?.id) {
      const existingLike = await prisma.blogPostLike.findUnique({
        where: {
          userId_postId: {
            userId: user.id,
            postId: post.id
          }
        }
      });
      liked = !!existingLike;
    }

    return NextResponse.json({
      liked,
      likes: post._count.likedBy
    });
  } catch (error) {
    console.error('Error fetching like status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Get the slug/ID from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const slugOrId = pathParts[pathParts.length - 2] || ''; // Get slug or ID (second to last part)

    // Determine if this is a CUID (ID) or a slug
    const isCuid = /^c[a-z0-9]{24}$/.test(slugOrId); // CUID pattern: starts with 'c' followed by 24 alphanumeric chars
    
    console.log('POST /api/blog/posts/[slug]/like called with:', slugOrId, 'isCuid:', isCuid);
    
    // Find the blog post by ID or slug
    const post = await prisma.blogPost.findUnique({
      where: isCuid ? { id: slugOrId } : { slug: slugOrId },
      select: { id: true, status: true, _count: { select: { likedBy: true } } }
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