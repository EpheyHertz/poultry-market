import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
//   { params }: { params: { slug: string } }
) {
  try {
    const slug  = request.nextUrl.pathname.split('/').pop() || '';
    const currentUser = await getCurrentUser();

    // Find store owner by slug (could be dashboardSlug, customDomain, or id)
    const storeOwner = await prisma.user.findFirst({
      where: {
        OR: [
          { dashboardSlug: slug },
          { customDomain: slug },
          { id: slug },
          { name: { contains: slug, mode: 'insensitive' } }
        ],
        role: {
          in: ['SELLER', 'COMPANY']
        },
        isActive: true
      },
      include: {
        products: {
          where: {
            isActive: true
          },
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
            categories: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        tags: true,
        followers: {
          include: {
            follower: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        following: {
          include: {
            following: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    if (!storeOwner) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Check if current user is following this store
    let isFollowing = false;
    if (currentUser) {
      const followRelation = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: storeOwner.id
          }
        }
      });
      isFollowing = !!followRelation;
    }

    // Calculate store statistics
    const totalProducts = storeOwner.products.length;
    const totalFollowers = storeOwner.followers.length;
    
    // Get all reviews across all products
    const allProductReviews = storeOwner.products.flatMap(product => 
      product.reviews.map(review => ({
        ...review,
        productId: product.id,
        productName: product.name,
      }))
    );
    
    const totalReviews = allProductReviews.length;
    const averageRating = totalReviews > 0 
      ? allProductReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    // Calculate individual product ratings
    const productsWithRatings = storeOwner.products.map(product => {
      const productRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;
      
      return {
        ...product,
        averageRating: productRating,
        totalReviews: product.reviews.length
      };
    });

    const response = {
      ...storeOwner,
      products: productsWithRatings,
      isFollowing,
      stats: {
        totalProducts,
        totalFollowers,
        totalReviews,
        averageRating: Number(averageRating.toFixed(1))
      },
      allProductReviews: allProductReviews.slice(0, 10) // Limit to 10 most recent reviews
    };

    // Remove sensitive information
    const { password, resetToken, resetTokenExpiry, verificationToken, verificationTokenExpiry, ...safeStoreOwner } = response;

    return NextResponse.json(safeStoreOwner);
  } catch (error) {
    console.error('Error fetching store data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store data' },
      { status: 500 }
    );
  }
}
