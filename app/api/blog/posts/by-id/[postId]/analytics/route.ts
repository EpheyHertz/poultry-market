import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get analytics for a specific blog post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { postId } = await params;
    
    // Get the post and verify ownership
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true }
        }
      }
    });
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check ownership or admin
    const isAdmin = user.role === 'ADMIN';
    if (post.authorId !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only view analytics for your own posts' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30', 10);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    // Get comprehensive post analytics
    const [
      viewStats,
      viewsByDay,
      viewsByReferrer,
      engagementStats,
      commentStats,
      recentViews
    ] = await Promise.all([
      // Overall view stats
      prisma.blogPostView.aggregate({
        where: { postId },
        _count: true,
        _avg: {
          readDuration: true,
          scrollDepth: true
        }
      }),
      
      // Views by day
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as views,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(read_duration) as avg_read_duration
        FROM blog_post_views
        WHERE post_id = ${postId}
        AND created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      
      // Views by referrer
      prisma.blogPostView.groupBy({
        by: ['referrer'],
        where: {
          postId,
          referrer: { not: null }
        },
        _count: true,
        orderBy: {
          _count: {
            referrer: 'desc'
          }
        },
        take: 10
      }),
      
      // Engagement stats (likes)
      prisma.blogPostLike.aggregate({
        where: { postId },
        _count: true
      }),
      
      // Comment stats
      prisma.blogComment.aggregate({
        where: { 
          postId,
          isApproved: true
        },
        _count: true
      }),
      
      // Recent views with user info
      prisma.blogPostView.findMany({
        where: { postId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      })
    ]);
    
    // Calculate engagement rate
    const totalViews = viewStats._count || 0;
    const totalLikes = engagementStats._count || 0;
    const totalComments = commentStats._count || 0;
    const engagementRate = totalViews > 0 
      ? ((totalLikes + totalComments) / totalViews) * 100 
      : 0;
    
    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        publishedAt: post.publishedAt
      },
      overview: {
        totalViews,
        uniqueViews: post.uniqueViewCount || 0,
        totalLikes,
        totalComments,
        shareCount: post.shareCount,
        avgReadDuration: Math.round(viewStats._avg.readDuration || 0),
        avgScrollDepth: Math.round(viewStats._avg.scrollDepth || 0),
        engagementRate: Math.round(engagementRate * 10) / 10
      },
      viewsByDay,
      viewsByReferrer: viewsByReferrer.map(r => ({
        referrer: r.referrer || 'Direct',
        count: r._count
      })),
      recentViews: recentViews.map(v => ({
        id: v.id,
        user: v.user,
        isAnonymous: !v.userId,
        readDuration: v.readDuration,
        scrollDepth: v.scrollDepth,
        referrer: v.referrer,
        createdAt: v.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching post analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
