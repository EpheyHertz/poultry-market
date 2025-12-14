import { NextRequest, NextResponse } from 'next/server';
import { getPublicAuthorProfile } from '@/lib/author';
import { prisma } from '@/lib/prisma';

// GET - Get public author profile by username
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }
    
    const profile = await getPublicAuthorProfile(username.toLowerCase());
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 404 }
      );
    }
    
    // Get follower count from User model
    const followerCount = await prisma.follow.count({
      where: { followingId: profile.userId }
    });
    
    // Get total engagement stats
    const engagementStats = await prisma.blogPost.aggregate({
      where: {
        authorProfileId: profile.id,
        status: 'PUBLISHED'
      },
      _sum: {
        viewCount: true,
        likes: true
      },
      _count: true
    });
    
    return NextResponse.json({
      profile: {
        ...profile,
        followerCount,
        stats: {
          totalPosts: engagementStats._count || 0,
          totalViews: engagementStats._sum.viewCount || 0,
          totalLikes: engagementStats._sum.likes || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching public author profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch author profile' },
      { status: 500 }
    );
  }
}
