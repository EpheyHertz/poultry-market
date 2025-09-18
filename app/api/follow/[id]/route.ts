import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const followSchema = z.object({
  id: z.string().min(1)
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the user ID from params
    const resolvedParams = await params;
    const { id: userId } = followSchema.parse(resolvedParams);

    if (user.id === userId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: userId
        }
      }
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existingFollow.id }
      });

      return NextResponse.json({
        following: false,
        message: 'Successfully unfollowed user'
      });
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId: user.id,
          followingId: userId
        }
      });

      return NextResponse.json({
        following: true,
        message: 'Successfully followed user'
      });
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    // Get the user ID from params
    const resolvedParams = await params;
    const { id: userId } = followSchema.parse(resolvedParams);

    if (!user?.id) {
      return NextResponse.json({
        following: false,
        followers: 0,
        following_count: 0
      });
    }

    // Check if currently following
    const isFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: userId
        }
      }
    });

    // Get follower and following counts
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({
        where: { followingId: userId }
      }),
      prisma.follow.count({
        where: { followerId: userId }
      })
    ]);

    return NextResponse.json({
      following: !!isFollowing,
      followers: followersCount,
      following_count: followingCount
    });
  } catch (error) {
    console.error('Error getting follow status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}