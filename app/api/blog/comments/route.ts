import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createCommentSchema = z.object({
  postId: z.string().cuid('Invalid post ID'),
  content: z.string().min(1, 'Content is required').max(1000, 'Content too long'),
  images: z.array(z.string()).max(2, 'Maximum 2 images allowed for comments').optional().default([]),
  parentId: z.string().cuid().optional(), // For replies
  guestName: z.string().min(1).max(100).optional(),
  guestEmail: z.string().email().optional(),
});

// GET - Fetch comments for a post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const includeUnapproved = searchParams.get('includeUnapproved') === 'true';

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Check permissions for unapproved comments
    let canViewUnapproved = false;
    if (includeUnapproved) {
      const user = await getCurrentUser();
      canViewUnapproved = user?.role === 'ADMIN';
    }

    const whereClause: any = {
      postId,
      parentId: null // Only top-level comments
    };

    if (!canViewUnapproved) {
      whereClause.isApproved = true;
    }

    const comments = await prisma.blogComment.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        },
        replies: {
          where: canViewUnapproved ? {} : { isApproved: true },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ comments });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST - Create new comment
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/blog/comments - Request received');
    const user = await getCurrentUser();
    console.log('User:', user ? user.id : 'Guest');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const validatedData = createCommentSchema.parse(body);
    console.log('Validated data:', validatedData);

    // Check if post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: validatedData.postId },
      select: { id: true, status: true }
    });

    if (!post || !['PUBLISHED', 'APPROVED'].includes(post.status)) {
      return NextResponse.json(
        { error: 'Post not found or not published' },
        { status: 404 }
      );
    }

    // Check if parent comment exists (for replies)
    if (validatedData.parentId) {
      const parentComment = await prisma.blogComment.findUnique({
        where: { id: validatedData.parentId },
        select: { id: true, postId: true }
      });

      if (!parentComment || parentComment.postId !== validatedData.postId) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    let commentData: any = {
      content: validatedData.content,
      images: validatedData.images || [],
      postId: validatedData.postId,
      parentId: validatedData.parentId || null,
      isApproved: false // Comments require approval by default
    };

    if (user) {
      // Authenticated user comment
      commentData.authorId = user.id;
      
      // Auto-approve comments from admins
      if (user.role === 'ADMIN') {
        commentData.isApproved = true;
      }
    } else {
      // Guest comment
      if (!validatedData.guestName || !validatedData.guestEmail) {
        return NextResponse.json(
          { error: 'Guest name and email are required for guest comments' },
          { status: 400 }
        );
      }
      
      commentData.guestName = validatedData.guestName;
      commentData.guestEmail = validatedData.guestEmail;
    }

    const comment = await prisma.blogComment.create({
      data: commentData,
      include: {
        author: user ? {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        } : undefined
      }
    });

    return NextResponse.json(comment);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}