import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnnouncementType, AnnouncementStatus, UserRole } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';

interface Params {
  id: string;
}

// GET /api/announcements/[id] - Get single announcement
export async function GET(
  request: NextRequest,
//   { params }: { params: Params }
) {
  try {
    const user = await getCurrentUser()
    const id = request.nextUrl.pathname.split('/').pop() || ''
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id:id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true
          }
        },
        views: {
          where: { userId: user.id },
          select: { id: true }
        },
        reactions: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const userRole = user.role as UserRole;

    // Check if user can view this announcement
    const canView = 
      announcement.isGlobal ||
      announcement.targetRoles.includes(userRole) ||
      announcement.authorId === user.id ||
      userRole === 'ADMIN';

    if (!canView) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Record view if not already viewed
    if (announcement.views.length === 0) {
      await prisma.announcementView.create({
        data: {
          announcementId:id,
          userId: user.id
        }
      });

      // Update view count
      await prisma.announcement.update({
        where: { id: id },
        data: { viewCount: { increment: 1 } }
      });
    }

    // Format response
    const reactionCounts = announcement.reactions.reduce((acc, reaction) => {
      acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userReaction = announcement.reactions.find(r => r.userId === user.id)?.reaction;

    const formattedAnnouncement = {
      ...announcement,
      isViewed: true,
      userReaction,
      reactionCounts,
      views: undefined,
      reactions: undefined
    };

    return NextResponse.json(formattedAnnouncement);

  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcement' },
      { status: 500 }
    );
  }
}

// PUT /api/announcements/[id] - Update announcement
export async function PUT(
  request: NextRequest,
//   { params }: { params: Params }
) {
  try {
   const user = await getCurrentUser()
    const id = request.nextUrl.pathname.split('/').pop() || ''
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id:id }
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const userRole = user.role as UserRole;

    // Check if user can edit this announcement
    const canEdit = 
      announcement.authorId === user.id ||
      userRole === 'ADMIN';

    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      content,
      type,
      status,
      productId,
      targetRoles,
      isGlobal,
      publishAt,
      expiresAt,
      imageUrl,
      attachmentUrl
    } = body;

    // Only admins can create global announcements
    if (isGlobal && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create global announcements' },
        { status: 403 }
      );
    }

    // Validate product ownership if productId is provided
    if (productId) {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          ...(userRole !== 'ADMIN' && { sellerId: user.id })
        }
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      ...(title && { title }),
      ...(content && { content }),
      ...(type && { type: type as AnnouncementType }),
      ...(productId !== undefined && { productId }),
      ...(targetRoles && { targetRoles }),
      ...(isGlobal !== undefined && { isGlobal }),
      ...(publishAt !== undefined && { publishAt: publishAt ? new Date(publishAt) : null }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(attachmentUrl !== undefined && { attachmentUrl })
    };

    // Handle status changes
    if (status && status !== announcement.status) {
      updateData.status = status as AnnouncementStatus;
      
      if (status === 'PUBLISHED' && !announcement.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const updatedAnnouncement = await prisma.announcement.update({
      where: { id: id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true
          }
        }
      }
    });

    return NextResponse.json(updatedAnnouncement);

  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 }
    );
  }
}

// DELETE /api/announcements/[id] - Delete announcement
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

    const announcement = await prisma.announcement.findUnique({
      where: { id: id }
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const userRole = user.role as UserRole;

    // Check if user can delete this announcement
    const canDelete = 
      announcement.authorId === user.id ||
      userRole === 'ADMIN';

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.announcement.delete({
      where: { id: id }
    });

    return NextResponse.json({ message: 'Announcement deleted successfully' });

  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    );
  }
}
