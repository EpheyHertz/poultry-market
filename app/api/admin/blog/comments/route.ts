import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const postId = searchParams.get('postId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause based on filters
    const whereClause: any = {};

    // Status filter
    if (status && status !== 'all') {
      if (status === 'pending') {
        whereClause.isApproved = false;
        whereClause.moderationReason = null;
      } else if (status === 'approved') {
        whereClause.isApproved = true;
      } else if (status === 'rejected') {
        whereClause.moderationReason = { not: null };
      }
    }

    // Post filter
    if (postId) {
      whereClause.postId = postId;
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { guestName: { contains: search, mode: 'insensitive' } },
        { guestEmail: { contains: search, mode: 'insensitive' } },
        { 
          author: { 
            name: { contains: search, mode: 'insensitive' } 
          } 
        },
        { 
          post: { 
            title: { contains: search, mode: 'insensitive' } 
          } 
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.blogComment.count({
      where: whereClause,
    });

    // Get comments with pagination
    const comments = await prisma.blogComment.findMany({
      where: whereClause,
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
            slug: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      comments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}