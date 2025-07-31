import { NextRequest, NextResponse } from 'next/server';
import {  getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Params {
  id: string;
}

// POST /api/announcements/[id]/react - Add or update reaction
export async function POST(
  request: NextRequest,
//   { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser()
    const id = request.nextUrl.pathname.split('/').pop() || ''
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reaction } = body;

    if (!reaction) {
      return NextResponse.json(
        { error: 'Reaction is required' },
        { status: 400 }
      );
    }

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id:id }
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Upsert reaction
    const announcementReaction = await prisma.announcementReaction.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId: user.id
        }
      },
      update: { reaction },
      create: {
        announcementId: id,
        userId: user.id,
        reaction
      }
    });

    return NextResponse.json(announcementReaction);

  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

// DELETE /api/announcements/[id]/react - Remove reaction
export async function DELETE(
  request: NextRequest,
//   { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser()
     const id = request.nextUrl.pathname.split('/').pop() || ''
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.announcementReaction.deleteMany({
      where: {
        announcementId: id,
        userId: user.id
      }
    });

    return NextResponse.json({ message: 'Reaction removed successfully' });

  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
