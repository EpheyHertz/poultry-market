import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnnouncementType, AnnouncementStatus, UserRole } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { sendAnnouncementNotifications } from '@/lib/notifications';

// GET /api/announcements - Get announcements with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
         
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as AnnouncementType | null;
    const status = searchParams.get('status') as AnnouncementStatus | null;
    const authorId = searchParams.get('authorId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const userRole = user.role as UserRole;

    // Build where clause based on user permissions and filters
    let whereClause: any = {
      OR: [
        { isGlobal: true },
        { targetRoles: { has: userRole } },
        { authorId: user.id } // User can see their own announcements
      ]
    };

    // Only show published announcements to non-authors unless they're admin
    if (userRole !== 'ADMIN') {
      whereClause.AND = [
        {
          OR: [
            { status: 'PUBLISHED', publishAt: { lte: new Date() } },
            { authorId: user.id } // Authors can see their own drafts
          ]
        }
      ];
    }

    // Apply filters
    if (type) {
      whereClause.type = type;
    }
    if (status && (userRole === 'ADMIN' || authorId === user.id)) {
      whereClause.status = status;
    }
    if (authorId && (userRole === 'ADMIN' || authorId === user.id)) {
      whereClause.authorId = authorId;
    }

    // Add search functionality
    if (search) {
      whereClause.OR = [
        ...(whereClause.OR || []),
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { 
          author: { 
            name: { contains: search, mode: 'insensitive' } 
          }
        }
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
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
        },
        _count: {
          select: {
            views: true,
            reactions: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Published first
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    // Format response with computed fields
    const formattedAnnouncements = announcements.map(announcement => {
      const reactionCounts = announcement.reactions.reduce((acc, reaction) => {
        acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const userReaction = announcement.reactions.find(r => r.userId === user.id)?.reaction;
   
      return {
        ...announcement,
        isViewed: announcement.views.length > 0,
        userReaction,
        reactionCounts,
        views: undefined,
        reactions: undefined,
        _count: undefined
      };
    });
    //  console.log("all an?nouncements:", formattedAnnouncements);

    return NextResponse.json({
      announcements: formattedAnnouncements,
      hasMore: announcements.length === limit
    });

  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

// POST /api/announcements - Create new announcement
export async function POST(request: NextRequest) {
  try {
   const user = await getCurrentUser()
        
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = user.role as UserRole;
    
    // Check if user can create announcements
    if (!['ADMIN', 'COMPANY', 'SELLER'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      content,
      type,
      productId,
      targetRoles,
      isGlobal,
      publishAt,
      expiresAt,
      imageUrl,
      attachmentUrl
    } = body;

    console.log('Creating announcement with data:', {
      title,
      content,
      type,
      imageUrl,
      attachmentUrl,
      isGlobal,
      targetRoles
    });

    // Validate required fields
    if (!title || !content || !type) {
      return NextResponse.json(
        { error: 'Title, content, and type are required' },
        { status: 400 }
      );
    }

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

    // Create announcement
    const announcementData = {
      title,
      content,
      type: type as AnnouncementType,
      authorId: user.id,
      productId,
      targetRoles: targetRoles || [],
      isGlobal: isGlobal || false,
      publishAt: publishAt ? new Date(publishAt) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      imageUrl: imageUrl || '',
      attachmentUrl: attachmentUrl || '',
      status: publishAt ? 'DRAFT' as AnnouncementStatus : 'PUBLISHED' as AnnouncementStatus,
      publishedAt: publishAt ? undefined : new Date()
    };

    console.log('Creating announcement in database with data:', announcementData);

    const announcement = await prisma.announcement.create({
      data: announcementData,
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

    // Send email notifications to relevant users based on announcement type
    try {

      // Send notifications using the new professional announcement system
      let roles: string[] = [];
      
      if (announcement.isGlobal) {
        roles = ['ALL'];
      } else if (announcement.targetRoles && announcement.targetRoles.length > 0) {
        roles = announcement.targetRoles as string[];
      } else {
        // Map announcement type to target roles
        const roleMapping: Record<string, string[]> = {
          'SALE': ['CUSTOMER', 'DELIVERY_AGENT'],
          'DISCOUNT': ['CUSTOMER'],
          'SLAUGHTER_SCHEDULE': ['CUSTOMER', 'SELLER'],
          'PRODUCT_LAUNCH': ['CUSTOMER'],
          'GENERAL': ['CUSTOMER', 'SELLER', 'COMPANY', 'DELIVERY_AGENT'],
          'URGENT': ['CUSTOMER', 'SELLER', 'COMPANY', 'DELIVERY_AGENT', 'ADMIN']
        };
        roles = roleMapping[announcement.type] || ['CUSTOMER'];
      }

      // Use the new professional announcement notification system
      const notificationResult = await sendAnnouncementNotifications(
        announcement.id,
        user.id,
        roles
      );

      console.log(`Professional announcement notifications sent:`, notificationResult);
    } catch (notificationError) {
      console.error('Failed to send announcement notifications:', notificationError);
      // Don't fail the announcement creation if notifications fail
    }

    return NextResponse.json(announcement);

  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    );
  }
}
