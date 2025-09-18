import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { use } from 'react';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// DELETE - Delete a blog post (only if user owns it)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = use(params);
    const { id } = resolvedParams;

    // Check if the blog post exists and belongs to the user
    const blogPost = await prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
        title: true,
      },
    });

    if (!blogPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (blogPost.authorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own blog posts' },
        { status: 403 }
      );
    }

    // Prevent deletion of published posts (optional - you can remove this if you want to allow it)
    if (blogPost.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot delete published blog posts. Please contact support.' },
        { status: 400 }
      );
    }

    // Delete the blog post
    await prisma.blogPost.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Blog post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get a specific blog post (for editing)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const blogPost = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!blogPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (blogPost.authorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only view your own blog posts' },
        { status: 403 }
      );
    }

    return NextResponse.json(blogPost);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}