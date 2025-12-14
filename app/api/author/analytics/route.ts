import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get detailed author analytics
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const profile = await prisma.authorProfile.findUnique({
      where: { userId: user.id }
    });
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Author profile not found' },
        { status: 404 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const periodDays = parseInt(period, 10);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    
    // Get comprehensive analytics
    const [
      overviewStats,
      viewsByDay,
      topPosts,
      categoryBreakdown,
      engagementTrends,
      recentActivity
    ] = await Promise.all([
      // Overview stats
      prisma.blogPost.aggregate({
        where: {
          authorProfileId: profile.id,
          status: 'PUBLISHED'
        },
        _sum: {
          viewCount: true,
          likes: true,
          shareCount: true
        },
        _count: true,
        _avg: {
          readingTime: true
        }
      }),
      
      // Views by day
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as views
        FROM blog_post_views
        WHERE post_id IN (
          SELECT id FROM blog_posts 
          WHERE author_profile_id = ${profile.id}
        )
        AND created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      
      // Top performing posts
      prisma.blogPost.findMany({
        where: {
          authorProfileId: profile.id,
          status: 'PUBLISHED'
        },
        orderBy: { viewCount: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          viewCount: true,
          likes: true,
          shareCount: true,
          readingTime: true,
          publishedAt: true,
          category: true,
          _count: {
            select: {
              comments: true,
              likedBy: true
            }
          }
        }
      }),
      
      // Category breakdown
      prisma.blogPost.groupBy({
        by: ['category'],
        where: {
          authorProfileId: profile.id,
          status: 'PUBLISHED'
        },
        _count: true,
        _sum: {
          viewCount: true,
          likes: true
        }
      }),
      
      // Engagement trends (likes/comments over time)
      prisma.blogPostLike.groupBy({
        by: ['createdAt'],
        where: {
          post: { authorProfileId: profile.id },
          createdAt: { gte: startDate }
        },
        _count: true
      }),
      
      // Recent activity
      prisma.blogComment.findMany({
        where: {
          post: { authorProfileId: profile.id },
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          post: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      })
    ]);
    
    // Calculate growth metrics
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);
    
    const [currentPeriodViews, previousPeriodViews] = await Promise.all([
      prisma.blogPostView.count({
        where: {
          post: { authorProfileId: profile.id },
          createdAt: { gte: startDate }
        }
      }),
      prisma.blogPostView.count({
        where: {
          post: { authorProfileId: profile.id },
          createdAt: {
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      })
    ]);
    
    const viewsGrowth = previousPeriodViews > 0 
      ? ((currentPeriodViews - previousPeriodViews) / previousPeriodViews) * 100 
      : 0;
    
    return NextResponse.json({
      overview: {
        totalPosts: overviewStats._count,
        totalViews: overviewStats._sum.viewCount || 0,
        totalLikes: overviewStats._sum.likes || 0,
        totalShares: overviewStats._sum.shareCount || 0,
        avgReadingTime: Math.round(overviewStats._avg.readingTime || 0)
      },
      growth: {
        currentPeriodViews,
        previousPeriodViews,
        viewsGrowthPercent: Math.round(viewsGrowth * 10) / 10
      },
      viewsByDay,
      topPosts,
      categoryBreakdown: categoryBreakdown.map(cat => ({
        category: cat.category,
        posts: cat._count,
        views: cat._sum.viewCount || 0,
        likes: cat._sum.likes || 0
      })),
      engagementTrends,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching author analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
