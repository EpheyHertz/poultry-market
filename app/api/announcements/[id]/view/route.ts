import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract ID from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const id = pathParts[pathParts.length - 2]; // Get the ID before '/view'
    
    if (!id) {
      return NextResponse.json({ error: 'Invalid announcement ID' }, { status: 400 });
    }

    // First, check if the announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Check if user has already viewed this announcement
    const existingView = await prisma.announcementView.findUnique({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId: user.id
        }
      }
    });

    if (!existingView) {
      // Create new view record
      await prisma.announcementView.create({
        data: {
          announcementId: id,
          userId: user.id
        }
      });

      // Increment view count
      await prisma.announcement.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View tracking error:', error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}
