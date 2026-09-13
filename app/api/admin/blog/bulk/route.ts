import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyOnPublish } from '@/lib/email/blog-notifications';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can perform bulk actions
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can perform bulk actions.' },
        { status: 403 }
      );
    }

    const { action, postIds } = await request.json();

    if (!action || !postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid action or post IDs' },
        { status: 400 }
      );
    }

    let updateData: any = {};
    let message = '';
    let publishNotifyIds: string[] = [];

    switch (action) {
      case 'publish':
        updateData = {
          status: 'PUBLISHED',
          publishedAt: new Date()
        };
        message = `${postIds.length} posts published successfully`;
        // Capture only the posts that are genuinely transitioning INTO
        // published so we email subscribers once per newly-live article.
        {
          const transitioning = await prisma.blogPost.findMany({
            where: { id: { in: postIds }, status: { not: 'PUBLISHED' } },
            select: { id: true },
          });
          publishNotifyIds = transitioning.map((p) => p.id);
        }
        break;

      case 'draft':
        updateData = {
          status: 'DRAFT',
          publishedAt: null
        };
        message = `${postIds.length} posts moved to draft`;
        break;

      case 'archive':
        updateData = {
          status: 'ARCHIVED'
        };
        message = `${postIds.length} posts archived`;
        break;

      case 'feature':
        updateData = {
          featured: true
        };
        message = `${postIds.length} posts marked as featured`;
        break;

      case 'unfeature':
        updateData = {
          featured: false
        };
        message = `${postIds.length} posts unmarked as featured`;
        break;

      case 'delete':
        await prisma.blogPost.deleteMany({
          where: {
            id: { in: postIds }
          }
        });
        return NextResponse.json({
          success: true,
          message: `${postIds.length} posts deleted successfully`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Perform bulk update
    const result = await prisma.blogPost.updateMany({
      where: {
        id: { in: postIds }
      },
      data: updateData
    });

    // Fan out the subscriber "new article" email for posts that just went
    // live. Fire-and-forget + idempotent so the bulk response never waits on
    // (or fails because of) email delivery.
    for (const postId of publishNotifyIds) {
      notifyOnPublish(postId);
    }

    return NextResponse.json({
      success: true,
      message,
      updatedCount: result.count
    });

  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}