import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('GET /api/blog/posts/[id]/like called with ID:', id);
    const user = await getCurrentUser();

    // Find the blog post
    const post = await prisma.blogPost.findUnique({
      where: { id },
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
            postId: id
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('POST /api/blog/posts/[id]/like called with ID:', id);
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find the blog post
    const post = await prisma.blogPost.findUnique({
      where: { id },
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
          postId: id
        }
      }
    });

    let liked: boolean;
    if (existingLike) {
      // Unlike the post
      await prisma.blogPostLike.delete({
        where: {
          userId_postId: {
            userId: user.id,
            postId: id
          }
        }
      });
      liked = false;
    } else {
      // Like the post
      await prisma.blogPostLike.create({
        data: {
          userId: user.id,
          postId: id
        }
      });
      liked = true;
    }

    // Get updated like count
    const updatedPost = await prisma.blogPost.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            likedBy: true
          }
        }
      }
    });

    return NextResponse.json({
      liked,
      likes: updatedPost?._count.likedBy || 0
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}