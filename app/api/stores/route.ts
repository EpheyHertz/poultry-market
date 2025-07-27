import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const location = searchParams.get('location') || '';
    const tag = searchParams.get('tag') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      role: {
        in: ['SELLER', 'COMPANY']
      },
      isActive: true
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role && (role === 'SELLER' || role === 'COMPANY')) {
      whereClause.role = role;
    }

    if (location) {
      whereClause.location = { contains: location, mode: 'insensitive' };
    }

    if (tag) {
      whereClause.tags = {
        some: {
          tag: tag
        }
      };
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'name':
        orderBy = { name: sortOrder };
        break;
      case 'followers':
        orderBy = { followers: { _count: sortOrder } };
        break;
      case 'products':
        orderBy = { products: { _count: sortOrder } };
        break;
      default:
        orderBy = { createdAt: sortOrder };
    }

    const [stores, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          products: {
            where: {
              isActive: true
            },
            take: 3, // Only get 3 products for preview
            include: {
              reviews: {
                where: {
                  isVisible: true
                },
                select: {
                  rating: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          tags: true,
          followers: {
            select: {
              id: true
            }
          },
          _count: {
            select: {
              products: {
                where: {
                  isActive: true
                }
              },
              followers: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),

      prisma.user.count({
        where: whereClause
      })
    ]);

    // Calculate statistics for each store
    const storesWithStats = stores.map(store => {
      const allReviews = store.products.flatMap(product => product.reviews);
      const averageRating = allReviews.length > 0
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length
        : 0;

      const { password, resetToken, resetTokenExpiry, verificationToken, verificationTokenExpiry, ...safeStore } = store;

      return {
        ...safeStore,
        stats: {
          totalProducts: store._count.products,
          totalFollowers: store._count.followers,
          totalReviews: allReviews.length,
          averageRating: Number(averageRating.toFixed(1))
        }
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      stores: storesWithStats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}
