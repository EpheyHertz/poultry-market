import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(1000, 'Content too long'),
  images: z.array(z.string().url()).max(2, 'Maximum 2 images allowed for comments').optional(),
});

// GET - Fetch individual comment
export async function GET(request: NextRequest) {
  try {
    // Get the id from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const id = pathParts[pathParts.length - 1] || ''; // Get the last part (id)

    const comment = await prisma.blogComment.findUnique({
      where: { id },
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
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
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

    return NextResponse.json(comment);

  } catch (error) {
    console.error('Error fetching comment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comment' },
      { status: 500 }
    );
  }
}

// PUT - Update comment
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Get the id from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const id = pathParts[pathParts.length - 1] || ''; // Get the last part (id)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find the comment and check ownership
    const existingComment = await prisma.blogComment.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true },
        },
      },
    });

    if (!existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user can edit this comment
    const canEdit = existingComment.authorId === user.id || user.role === 'ADMIN';

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit this comment' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateCommentSchema.parse(body);

    // Update the comment
    const updatedComment = await prisma.blogComment.update({
      where: { id },
      data: {
        content: validatedData.content,
        images: validatedData.images || [],
        isEdited: true,
        editedAt: new Date(),
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

    return NextResponse.json(updatedComment);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete comment
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Get the id from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const id = pathParts[pathParts.length - 1] || ''; // Get the last part (id)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find the comment and check ownership
    const existingComment = await prisma.blogComment.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true },
        },
        replies: {
          select: { id: true },
        },
      },
    });

    if (!existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user can delete this comment
    const canDelete = existingComment.authorId === user.id || user.role === 'ADMIN';

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this comment' },
        { status: 403 }
      );
    }

    // Delete the comment and all its replies (cascade delete should handle this)
    await prisma.blogComment.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: 'Comment deleted successfully',
      deletedReplies: existingComment.replies.length 
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}