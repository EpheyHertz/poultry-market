
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { DiscountType } from '@prisma/client'

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !['SELLER', 'COMPANY'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      productIds,
      hasDiscount, 
      discountType, 
      discountAmount, 
      discountStartDate, 
      discountEndDate 
    } = await request.json()

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ 
        error: 'Product IDs array is required' 
      }, { status: 400 })
    }

    // Verify all products belong to the user
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        sellerId: user.id
      }
    })

    if (products.length !== productIds.length) {
      return NextResponse.json({ 
        error: 'Some products not found or not owned by user' 
      }, { status: 403 })
    }

    // Validate discount dates
    if (hasDiscount) {
      const startDate = new Date(discountStartDate)
      const endDate = new Date(discountEndDate)
      
      if (endDate <= startDate) {
        return NextResponse.json({ 
          error: 'End date must be after start date' 
        }, { status: 400 })
      }

      if (startDate < new Date()) {
        return NextResponse.json({ 
          error: 'Start date cannot be in the past' 
        }, { status: 400 })
      }

      if (discountType === 'PERCENTAGE' && (discountAmount <= 0 || discountAmount > 100)) {
        return NextResponse.json({ 
          error: 'Percentage discount must be between 1-100' 
        }, { status: 400 })
      }

      // Validate fixed amount against each product's price
      if (discountType === 'FIXED_AMOUNT') {
        const invalidProducts = products.filter(p => discountAmount >= p.price)
        if (invalidProducts.length > 0) {
          return NextResponse.json({ 
            error: `Fixed discount cannot be equal to or greater than product price for: ${invalidProducts.map(p => p.name).join(', ')}` 
          }, { status: 400 })
        }
      }
    }

    const updateData: any = {
      hasDiscount,
      discountType: hasDiscount ? discountType as DiscountType : null,
      discountAmount: hasDiscount ? parseFloat(discountAmount) : null,
      discountStartDate: hasDiscount ? new Date(discountStartDate) : null,
      discountEndDate: hasDiscount ? new Date(discountEndDate) : null
    }

    // Update all products
    await prisma.product.updateMany({
      where: {
        id: { in: productIds }
      },
      data: updateData
    })

    // Manage DISCOUNTED tags
    if (hasDiscount) {
      // Add DISCOUNTED tag to all products
      for (const productId of productIds) {
        await prisma.productTag.upsert({
          where: {
            productId_tag: {
              productId,
              tag: 'DISCOUNTED'
            }
          },
          update: {},
          create: {
            productId,
            tag: 'DISCOUNTED'
          }
        })
      }
    } else {
      // Remove DISCOUNTED tag from all products
      await prisma.productTag.deleteMany({
        where: {
          productId: { in: productIds },
          tag: 'DISCOUNTED'
        }
      })
    }

    return NextResponse.json({ 
      message: `Successfully updated discount for ${productIds.length} products`,
      updatedCount: productIds.length
    })
  } catch (error) {
    console.error('Bulk discount update error:', error)
    return NextResponse.json({ error: 'Failed to update bulk discount' }, { status: 500 })
  }
}
