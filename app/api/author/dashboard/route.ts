import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAuthorDashboardData } from '@/lib/author';
import { prisma } from '@/lib/prisma';

// GET - Get author dashboard data
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has an author profile
    const profile = await prisma.authorProfile.findUnique({
      where: { userId: user.id }
    });
    
    if (!profile) {
      return NextResponse.json({
        hasProfile: false,
        message: 'No author profile found. Create one to start blogging.'
      });
    }
    
    const dashboardData = await getAuthorDashboardData(user.id);
    
    if (!dashboardData) {
      return NextResponse.json(
        { error: 'Failed to load dashboard data' },
        { status: 500 }
      );
    }
    
    // Get follower/following counts from User model
    const socialCounts = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        _count: {
          select: {
            followers: true,
            following: true
          }
        }
      }
    });
    
    return NextResponse.json({
      hasProfile: true,
      ...dashboardData,
      social: {
        followers: socialCounts?._count.followers || 0,
        following: socialCounts?._count.following || 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
