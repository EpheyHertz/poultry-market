import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { AnnouncementType, AnnouncementStatus } from '@/types/announcement';

export async function PUT(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract ID from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const id = pathParts[pathParts.length - 2]; // Get the ID before '/edit'
    
    if (!id) {
      return NextResponse.json({ error: 'Invalid announcement ID' }, { status: 400 });
    }
    
    const body = await request.json();

    // Find the announcement and check permissions
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: { author: true }
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Check if user can edit (owner or admin)
    const canEdit = announcement.authorId === user.id || user.role === 'ADMIN';
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Not authorized to edit this announcement' }, { status: 403 });
    }

    const {
      title,
      content,
      type,
      status,
      imageUrl,
      productId,
      targetRoles,
      isGlobal,
      publishAt,
      expiresAt
    } = body;

    // Update the announcement
    const updatedAnnouncement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(type && { type: type as AnnouncementType }),
        ...(status && { status: status as AnnouncementStatus }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(productId !== undefined && { productId }),
        ...(targetRoles && { targetRoles }),
        ...(isGlobal !== undefined && { isGlobal }),
        ...(publishAt !== undefined && { publishAt: publishAt ? new Date(publishAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        updatedAt: new Date()
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
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

    return NextResponse.json({ 
      message: 'Announcement updated successfully',
      announcement: updatedAnnouncement 
    });

  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract ID from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const id = pathParts[pathParts.length - 2]; // Get the ID before '/edit'
    
    if (!id) {
      return NextResponse.json({ error: 'Invalid announcement ID' }, { status: 400 });
    }

    // Find the announcement and check permissions
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: { author: true }
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Check if user can delete (owner or admin)
    const canDelete = announcement.authorId === user.id || user.role === 'ADMIN';
    
    if (!canDelete) {
      return NextResponse.json({ error: 'Not authorized to delete this announcement' }, { status: 403 });
    }

    // Delete the announcement (this will cascade delete related records)
    await prisma.announcement.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: 'Announcement deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}
