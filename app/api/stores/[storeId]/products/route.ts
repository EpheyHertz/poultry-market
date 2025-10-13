import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
context: { params: Promise<{ storeId: string }> }
) {
  try {
     const storeId  = request.nextUrl.pathname.split('/').pop() || '';
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');

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

    // Build where clause for products
    const whereClause: any = {
      sellerId: storeId,
      isActive: true,
      price: {
        gte: minPrice,
        lte: maxPrice
      }
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      whereClause.categories = {
        some: {
          category: {
            name: { contains: category, mode: 'insensitive' }
          }
        }
      };
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'name':
        orderBy = { name: sortOrder };
        break;
      case 'price':
        orderBy = { price: sortOrder };
        break;
      case 'stock':
        orderBy = { stock: sortOrder };
        break;
      case 'rating':
        // This would need a more complex query for actual rating sorting
        orderBy = { createdAt: sortOrder };
        break;
      default:
        orderBy = { createdAt: sortOrder };
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          reviews: {
            where: {
              isVisible: true
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          tags: true,
          categories: {
            include: {
              category: true
            }
          },
          likes: {
            select: {
              id: true,
              userId: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),

      prisma.product.count({
        where: whereClause
      })
    ]);

    // Calculate ratings and other stats for each product
    const productsWithStats = products.map(product => {
      const averageRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      return {
        ...product,
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews: product.reviews.length,
        totalLikes: product.likes.length
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      products: productsWithStats,
      store: {
        id: storeOwner.id,
        name: storeOwner.name,
        avatar: storeOwner.avatar,
        role: storeOwner.role
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
    console.error('Error fetching store products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store products' },
      { status: 500 }
    );
  }
}
