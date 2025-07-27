import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
//   { params }: { params: { storeId: string } }
) {
  try {
    const storeId  = request.nextUrl.pathname.split('/').pop() || '';
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : null;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const skip = (page - 1) * limit;

    // Verify the store exists
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
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Build where clause for reviews
    const whereClause: any = {
      product: {
        sellerId: storeId
      },
      isVisible: true
    };

    if (rating) {
      whereClause.rating = rating;
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'rating':
        orderBy = { rating: sortOrder };
        break;
      case 'helpful':
        orderBy = { likes: { _count: sortOrder } };
        break;
      default:
        orderBy = { createdAt: sortOrder };
    }

    const [reviews, totalCount, ratingDistribution] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              images: true
            }
          },
          likes: {
            select: {
              id: true,
              userId: true
            }
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  role: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),

      prisma.review.count({
        where: whereClause
      }),

      // Get rating distribution
      prisma.review.groupBy({
        by: ['rating'],
        where: {
          product: {
            sellerId: storeId
          },
          isVisible: true
        },
        _count: {
          rating: true
        }
      })
    ]);

    // Format rating distribution
    const ratingStats = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    let totalReviews = 0;
    let totalRatingSum = 0;

    ratingDistribution.forEach((item) => {
      ratingStats[item.rating as keyof typeof ratingStats] = item._count.rating;
      totalReviews += item._count.rating;
      totalRatingSum += item.rating * item._count.rating;
    });

    const averageRating = totalReviews > 0 ? totalRatingSum / totalReviews : 0;

    const reviewsWithStats = reviews.map(review => ({
      ...review,
      totalLikes: review.likes.length,
      totalReplies: review.replies.length
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      reviews: reviewsWithStats,
      store: {
        id: storeOwner.id,
        name: storeOwner.name,
        avatar: storeOwner.avatar,
        role: storeOwner.role
      },
      statistics: {
        totalReviews,
        averageRating: Number(averageRating.toFixed(1)),
        ratingDistribution: ratingStats
      },
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
    console.error('Error fetching store reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store reviews' },
      { status: 500 }
    );
  }
}
