import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch pending blog posts for admin review
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can view pending posts
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can view pending posts.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'PENDING_APPROVAL';
    const search = searchParams.get('search');

    const where: any = {
      status: status
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { author: { name: { contains: search, mode: 'insensitive' } } },
        { author: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Get total count for pagination
    const totalPosts = await prisma.blogPost.count({ where });

    // Fetch posts with pagination
    const posts = await prisma.blogPost.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true
          }
        },
        approvedByUser: {
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
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: [
        { submittedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalPosts / limit);

    return NextResponse.json({
      posts: posts.map(post => ({
        ...post,
        tags: post.tags.map(t => t.tag),
        commentCount: post._count.comments
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary: {
        pending: await prisma.blogPost.count({ where: { status: 'PENDING_APPROVAL' } }),
        approved: await prisma.blogPost.count({ where: { status: 'APPROVED' } }),
        rejected: await prisma.blogPost.count({ where: { status: 'REJECTED' } }),
        published: await prisma.blogPost.count({ where: { status: 'PUBLISHED' } })
      }
    });

  } catch (error) {
    console.error('Error fetching pending blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending blog posts' },
      { status: 500 }
    );
  }
}