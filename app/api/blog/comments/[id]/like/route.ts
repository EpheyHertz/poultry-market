import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const likeSchema = z.object({
  id: z.string().min(1)
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the comment ID from params
    const resolvedParams = await params;
    const { id: commentId } = likeSchema.parse(resolvedParams);

    // Find the comment
    const comment = await prisma.blogComment.findUnique({
      where: { id: commentId },
      select: { 
        id: true, 
        isApproved: true,
        post: {
          select: { status: true }
        }
      }
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Only allow likes on approved comments from published posts
    if (!comment.isApproved || comment.post.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Cannot like this comment' },
        { status: 400 }
      );
    }

    // Check if the user has already liked this comment
    const existingLike = await prisma.blogCommentLike.findUnique({
      where: {
        userId_commentId: {
          userId: user.id,
          commentId: commentId
        }
      }
    });

    if (existingLike) {
      // Unlike the comment
      await prisma.blogCommentLike.delete({
        where: { id: existingLike.id }
      });

      // Get like count
      const likeCount = await prisma.blogCommentLike.count({
        where: { commentId }
      });

      return NextResponse.json({
        liked: false,
        likes: likeCount
      });
    } else {
      // Like the comment
      await prisma.blogCommentLike.create({
        data: {
          userId: user.id,
          commentId: commentId
        }
      });

      // Get updated like count
      const likeCount = await prisma.blogCommentLike.count({
        where: { commentId }
      });

      return NextResponse.json({
        liked: true,
        likes: likeCount
      });
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    // Get the comment ID from params
    const resolvedParams = await params;
    const { id: commentId } = likeSchema.parse(resolvedParams);

    // Find the comment and check if user liked it
    const comment = await prisma.blogComment.findUnique({
      where: { id: commentId },
      select: { 
        id: true,
        likedBy: user?.id ? {
          where: { userId: user.id },
          select: { id: true }
        } : false
      }
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Get total like count
    const likeCount = await prisma.blogCommentLike.count({
      where: { commentId }
    });

    const isLiked = user?.id ? 
      Array.isArray(comment.likedBy) && comment.likedBy.length > 0 : false;

    return NextResponse.json({
      liked: isLiked,
      likes: likeCount
    });
  } catch (error) {
    console.error('Error getting comment likes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}