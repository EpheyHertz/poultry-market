import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const product = await prisma.product.findUnique({
//       where: { id: params.id },
//       include: {
//         seller: {
//           select: {
//             id: true,
//             name: true,
//             role: true,
//             dashboardSlug: true,
//             tags: {
//               select: {
//                 tag: true
//               }
//             }
//           }
//         }
//       }
//     })

//     if (!product) {
//       return NextResponse.json({ error: 'Product not found' }, { status: 404 })
//     }

//     return NextResponse.json(product)
//   } catch (error) {
//     return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
//   }
// }

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, description, price, stock, images } = await request.json()

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        images: images || product.images,
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            role: true,
            tags: {
              select: {
                tag: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.product.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const user = await getCurrentUser();

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: id },
          { slug: id }
        ],
        isActive: true
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            location: true,
            createdAt: true,
            dashboardSlug: true,
            tags: true
          }
        },
        tags: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            likes: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calculate average rating
    const averageRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    // Check if product is discounted
    let currentPrice = product.price;
    let isDiscounted = false;
    
    if (product.hasDiscount && product.discountStartDate && product.discountEndDate) {
      const now = new Date();
      const startDate = new Date(product.discountStartDate);
      const endDate = new Date(product.discountEndDate);
      
      if (now >= startDate && now <= endDate) {
        isDiscounted = true;
        if (product.discountType === 'PERCENTAGE') {
          currentPrice = product.price * (1 - (product.discountAmount || 0) / 100);
        } else {
          currentPrice = Math.max(0, product.price - (product.discountAmount || 0));
        }
      }
    }

    const productData = {
      ...product,
      averageRating: Math.round(averageRating * 10) / 10,
      currentPrice,
      isDiscounted
    };

    return NextResponse.json(productData);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
