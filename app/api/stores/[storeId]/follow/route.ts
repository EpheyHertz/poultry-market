import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
context: { params: Promise<{ storeId: string }> }
) {
  try {
    // const storeId  = request.nextUrl.pathname.split('/').pop() || '';
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

     const { storeId } = await context.params;

    if (user.id === storeId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Verify the store exists and is a seller/company
    const storeOwner = await prisma.user.findFirst({
      where: {
        id: storeId,
        role: {
          in: ['SELLER', 'COMPANY']
        },
        isActive: true
      }
    });

    if (!storeOwner) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: storeId
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
        message: 'Successfully unfollowed store'
      });
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId: user.id,
          followingId: storeId
        }
      });

      // Send notification to store owner
      try {
        await createNotification({
          receiverId: storeId,
          senderId: user.id,
          type: 'EMAIL',
          title: 'New Follower',
          message: `${user.name} is now following your store. This helps increase your store's visibility and reach!`
        });

        // Send SMS notification as well
        await createNotification({
          receiverId: storeId,
          senderId: user.id,
          type: 'EMAIL',
          title: 'New Follower',
          message: `${user.name} is now following your store. This helps increase your store's visibility and reach!`
        });
      } catch (notificationError) {
        console.error('Failed to send follow notification:', notificationError);
        // Don't fail the follow action if notification fails
      }

      return NextResponse.json({ 
        following: true,
        message: 'Successfully followed store'
      });
    }
  } catch (error) {
    console.error('Error updating follow status:', error);
    return NextResponse.json({ error: 'Failed to update follow status' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
//   { params }: { params: { storeId: string } }
) {
  try {
    const storeId  = request.nextUrl.pathname.split('/').pop() || '';
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ following: false });
    }

    // const { storeId } = params;

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: storeId
        }
      }
    });

    return NextResponse.json({ following: !!existingFollow });
  } catch (error) {
    console.error('Error checking follow status:', error);
    return NextResponse.json({ following: false });
  }
}
