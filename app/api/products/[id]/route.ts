import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { generateProductUpdateEmail, type ProductUpdateEmailData } from '@/lib/email-templates'

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
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, description, price, stock, images, type } = await request.json()

    // Validate required fields
    if (!name?.trim() || !description?.trim() || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (price <= 0) {
      return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 })
    }

    if (stock < 0) {
      return NextResponse.json({ error: 'Stock cannot be negative' }, { status: 400 })
    }

    // Store original product data for comparison
    const originalProduct = { ...product }

    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: {
        name: name.trim(),
        description: description.trim(),
        type,
        price: parseFloat(price),
        stock: parseInt(stock),
        images: images || product.images,
        updatedAt: new Date()
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Send email notification about product update
    try {
      const changes: string[] = [];
      if (originalProduct.name !== updatedProduct.name) {
        changes.push(`Name: "${originalProduct.name}" → "${updatedProduct.name}"`);
      }
      if (originalProduct.description !== updatedProduct.description) {
        changes.push(`Description updated`);
      }
      if (originalProduct.type !== updatedProduct.type) {
        changes.push(`Type: "${originalProduct.type}" → "${updatedProduct.type}"`);
      }
      if (originalProduct.price !== updatedProduct.price) {
        changes.push(`Price: Ksh ${originalProduct.price} → Ksh ${updatedProduct.price}`);
      }
      if (originalProduct.stock !== updatedProduct.stock) {
        changes.push(`Stock: ${originalProduct.stock} → ${updatedProduct.stock} units`);
      }

      if (changes.length > 0) {
        const emailData: ProductUpdateEmailData = {
          productName: updatedProduct.name,
          productId: updatedProduct.id,
          updatedBy: user.name || 'Unknown User',
          updatedByEmail: user.email!,
          updatedAt: new Date().toLocaleString(),
          changes,
          currentDetails: {
            type: updatedProduct.type,
            price: updatedProduct.price,
            stock: updatedProduct.stock,
            isActive: updatedProduct.isActive
          }
        };

        const emailContent = generateProductUpdateEmail(emailData);

        await sendEmail({
          to: user.email!,
          subject: `✅ Product Updated: ${updatedProduct.name}`,
          html: emailContent
        });

        console.log(`Product update email sent to ${user.email} for product ${updatedProduct.name}`);
      }
    } catch (emailError) {
      console.error('Failed to send product update email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.product.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}


export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // const { id } = params;
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
