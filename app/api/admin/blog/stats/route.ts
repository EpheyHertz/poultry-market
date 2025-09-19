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

    // Only admins can view blog stats
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can view blog stats.' },
        { status: 403 }
      );
    }

    // Get blog statistics
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalViews,
      totalComments,
      totalLikes,
      recentActivity
    ] = await Promise.all([
      // Total posts
      prisma.blogPost.count(),
      
      // Published posts
      prisma.blogPost.count({
        where: { status: 'PUBLISHED' }
      }),
      
      // Draft posts
      prisma.blogPost.count({
        where: { status: 'DRAFT' }
      }),
      
      // Total views
      prisma.blogPost.aggregate({
        _sum: {
          viewCount: true
        }
      }),
      
      // Total comments
      prisma.blogComment.count({
        where: { isApproved: true }
      }),
      
      // Total likes
      prisma.blogPostLike.count(),
      
      // Recent activity (last 10 activities)
      prisma.blogPost.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { name: true }
          }
        }
      })
    ]);

    // Format recent activity
    const formattedActivity = recentActivity.map(post => ({
      id: post.id,
      type: post.status === 'PUBLISHED' ? 'post_published' : 'post_created',
      message: post.status === 'PUBLISHED' 
        ? `Post "${post.title}" was published`
        : `New post "${post.title}" was created`,
      timestamp: post.createdAt.toISOString(),
      author: post.author.name
    }));

    return NextResponse.json({
      totalPosts,
      publishedPosts,
      draftPosts,
      totalViews: totalViews._sum.viewCount || 0,
      totalComments,
      totalLikes,
      recentActivity: formattedActivity
    });

  } catch (error) {
    console.error('Error fetching blog stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog statistics' },
      { status: 500 }
    );
  }
}