import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    switch (action) {
      case 'publish':
        updateData = { 
          status: 'PUBLISHED',
          publishedAt: new Date()
        };
        message = `${postIds.length} posts published successfully`;
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