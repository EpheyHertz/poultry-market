import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user= await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }



    // Only admins can access this endpoint
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const deliveryId = url.searchParams.get('deliveryId');
    const orderId = url.searchParams.get('orderId');
    const photoType = url.searchParams.get('photoType');
    const uploaderId = url.searchParams.get('uploaderId');
    
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};
    
    if (deliveryId) {
      where.deliveryId = deliveryId;
    }
    
    if (orderId) {
      where.delivery = { orderId };
    }
    
    if (photoType) {
      where.photoType = photoType;
    }
    
    if (uploaderId) {
      where.uploadedBy = uploaderId;
    }

    // Get delivery photos with full details
    const [photos, totalCount] = await Promise.all([
      prisma.deliveryPhoto.findMany({
        where,
        include: {
          delivery: {
            include: {
              order: {
                include: {
                  customer: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  },
                  items: {
                    include: {
                      product: {
                        include: {
                          seller: {
                            select: {
                              id: true,
                              name: true,
                              email: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              agent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.deliveryPhoto.count({ where })
    ]);

    // Get summary statistics
    const stats = await prisma.deliveryPhoto.groupBy({
      by: ['photoType'],
      _count: {
        id: true
      },
      where
    });

    const photoTypeCounts = stats.reduce((acc, stat) => {
      acc[stat.photoType] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      photos,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      statistics: {
        totalPhotos: totalCount,
        photoTypeCounts
      }
    });

  } catch (error) {
    console.error('Admin delivery photos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery photos' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // const user = await prisma.user.findUnique({
    //   where: { id: session.user.id },
    //   select: { role: true }
    // });

    // Only admins can delete photos
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { photoId } = await request.json();

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
    }

    // Get photo details before deletion
    const photo = await prisma.deliveryPhoto.findUnique({
      where: { id: photoId },
      select: {
        cloudinaryPublicId: true
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete from database
    await prisma.deliveryPhoto.delete({
      where: { id: photoId }
    });

    // TODO: Delete from Cloudinary if cloudinaryPublicId exists
    // This would require importing cloudinary and calling destroy method

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete delivery photo error:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
