import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const moderateCommentSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(), // For rejection reason
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Get the id from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const id = pathParts[pathParts.length - 2] || ''; // Get id (second to last part)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = moderateCommentSchema.parse(body);

    // Find the comment
    const comment = await prisma.blogComment.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (validatedData.action === 'approve') {
      // Approve the comment
      const approvedComment = await prisma.blogComment.update({
        where: { id },
        data: {
          isApproved: true,
          moderatedAt: new Date(),
          moderatedBy: user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // TODO: Send notification to comment author about approval
      // This would integrate with your notification system

      return NextResponse.json({
        message: 'Comment approved successfully',
        comment: approvedComment,
      });

    } else {
      // Reject the comment (soft delete by marking as not approved and adding reason)
      const rejectedComment = await prisma.blogComment.update({
        where: { id },
        data: {
          isApproved: false,
          moderatedAt: new Date(),
          moderatedBy: user.id,
          moderationReason: validatedData.reason || 'Comment rejected by moderator',
        },
      });

      // TODO: Send notification to comment author about rejection
      // This would integrate with your notification system

      return NextResponse.json({
        message: 'Comment rejected successfully',
        reason: validatedData.reason,
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error moderating comment:', error);
    return NextResponse.json(
      { error: 'Failed to moderate comment' },
      { status: 500 }
    );
  }
}