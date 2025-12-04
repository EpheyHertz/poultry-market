import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Approval/rejection/publish schema
const approvalSchema = z.object({
  action: z.enum(['approve', 'reject', 'publish', 'reapprove']),
  rejectionReason: z.string().optional(),
  publishImmediately: z.boolean().default(true),
  featured: z.boolean().default(false),
});

// PATCH - Approve or reject a blog post
export async function PATCH(
  request: NextRequest
) {
  try {
    // Get the slug from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const slug = pathParts[pathParts.length - 2] || ''; // Get slug (second to last part)
    
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can approve/reject posts
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can approve/reject blog posts.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, rejectionReason, publishImmediately, featured } = approvalSchema.parse(body);

    // Find the blog post
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Validate status transitions based on action
    const validTransitions: Record<string, string[]> = {
      approve: ['PENDING_APPROVAL', 'REJECTED'],
      reject: ['PENDING_APPROVAL', 'APPROVED'],
      publish: ['APPROVED', 'PENDING_APPROVAL', 'REJECTED'],
      reapprove: ['REJECTED'],
    };

    const allowedStatuses = validTransitions[action] || [];
    if (!allowedStatuses.includes(existingPost.status)) {
      return NextResponse.json(
        { error: `Cannot ${action} a post with status ${existingPost.status}` },
        { status: 400 }
      );
    }

    let updateData: any = {
      approvedBy: user.id,
    };

    if (action === 'approve') {
      updateData.status = publishImmediately ? 'PUBLISHED' : 'APPROVED';
      updateData.approvedAt = new Date();
      updateData.rejectedAt = null;
      updateData.rejectionReason = null;
      updateData.featured = featured;
      
      if (publishImmediately) {
        updateData.publishedAt = new Date();
      }
    } else if (action === 'reject') {
      updateData.status = 'REJECTED';
      updateData.rejectedAt = new Date();
      updateData.approvedAt = null;
      updateData.rejectionReason = rejectionReason || 'Post does not meet our guidelines';
    } else if (action === 'publish') {
      // Directly publish a post (from APPROVED, PENDING_APPROVAL, or even REJECTED)
      updateData.status = 'PUBLISHED';
      updateData.publishedAt = new Date();
      updateData.approvedAt = updateData.approvedAt || new Date();
      updateData.rejectedAt = null;
      updateData.rejectionReason = null;
      updateData.featured = featured;
    } else if (action === 'reapprove') {
      // Reapprove a rejected post (sets to pending or approved based on publishImmediately)
      updateData.status = publishImmediately ? 'PUBLISHED' : 'APPROVED';
      updateData.approvedAt = new Date();
      updateData.rejectedAt = null;
      updateData.rejectionReason = null;
      updateData.featured = featured;
      
      if (publishImmediately) {
        updateData.publishedAt = new Date();
      }
    }

    // Update the blog post
    const updatedPost = await prisma.blogPost.update({
      where: { slug },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // TODO: Send notification email to the author
    // This would be implemented in the notifications system

    const actionMessages: Record<string, string> = {
      approve: publishImmediately ? 'Blog post approved and published successfully' : 'Blog post approved successfully',
      reject: 'Blog post rejected',
      publish: 'Blog post published successfully',
      reapprove: publishImmediately ? 'Blog post reapproved and published successfully' : 'Blog post reapproved successfully',
    };

    return NextResponse.json({
      success: true,
      message: actionMessages[action] || 'Blog post updated',
      blogPost: {
        id: updatedPost.id,
        title: updatedPost.title,
        slug: updatedPost.slug,
        status: updatedPost.status,
        approvedAt: updatedPost.approvedAt,
        rejectedAt: updatedPost.rejectedAt,
        rejectionReason: updatedPost.rejectionReason,
        author: updatedPost.author,
        approvedBy: updatedPost.approvedByUser
      }
    });

  } catch (error) {
    console.error('Error updating blog post approval status:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update blog post status' },
      { status: 500 }
    );
  }
}