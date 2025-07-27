import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import  { getCurrentUser} from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }



    // Only delivery agents can access this endpoint
    if (!user || user.role !== 'DELIVERY_AGENT') {
      return NextResponse.json({ error: 'Forbidden - Delivery agent access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Build where clause
    const where: any = {
      agentId:user.id
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Fetch deliveries assigned to this agent
    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true
                  }
                }
              }
            }
          }
        },
        deliveryPhotos: {
          select: {
            id: true,
            photoUrl: true,
            photoType: true,
            caption: true,
            createdAt: true,
            uploader: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json({
      success: true,
      deliveries
    });

  } catch (error) {
    console.error('Delivery agent deliveries error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}
