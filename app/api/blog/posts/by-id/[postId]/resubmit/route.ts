import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Resubmit a rejected blog post for review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { postId } = await params;
    
    // Get the post
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true }
        }
      }
    });
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check ownership
    if (post.authorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only resubmit your own posts' },
        { status: 403 }
      );
    }
    
    // Check if post is rejected
    if (post.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Only rejected posts can be resubmitted' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { submissionNotes } = body;
    
    // Update post status to pending
    const updatedPost = await prisma.blogPost.update({
      where: { id: postId },
      data: {
        status: 'PENDING_APPROVAL',
        submittedAt: new Date(),
        resubmittedAt: new Date(),
        resubmitCount: { increment: 1 },
        submissionNotes: submissionNotes || null,
        // Clear previous rejection
        rejectedAt: null,
        rejectionReason: null,
        approvedBy: null
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
    
    return NextResponse.json({
      post: updatedPost,
      message: 'Post resubmitted for review successfully'
    });
  } catch (error) {
    console.error('Error resubmitting post:', error);
    return NextResponse.json(
      { error: 'Failed to resubmit post' },
      { status: 500 }
    );
  }
}
