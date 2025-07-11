
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { DiscountType } from '@prisma/client'

export async function PUT(
  request: NextRequest
) {
   const id = request.nextUrl.pathname.split('/').pop() || ''
  try {
    const user = await getCurrentUser()
    
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

   
    
    const {
      hasDiscount,
      discountType,
      discountAmount,
      discountStartDate,
      discountEndDate
    } = await request.json()

    // Get the product first to verify ownership
    const product = await prisma.product.findUnique({
      where: { id },
      include: { seller: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if user owns this product (unless admin)
    if (user.role !== 'ADMIN' && product.sellerId !== user.id) {
      return NextResponse.json({ error: 'You can only manage discounts for your own products' }, { status: 403 })
    }

    // Validate discount data if discount is being enabled
    if (hasDiscount) {
      if (!discountType || !discountAmount || !discountStartDate || !discountEndDate) {
        return NextResponse.json({ 
          error: 'Missing required discount fields' 
        }, { status: 400 })
      }

      const startDate = new Date(discountStartDate)
      const endDate = new Date(discountEndDate)

      if (endDate <= startDate) {
        return NextResponse.json({ 
          error: 'End date must be after start date' 
        }, { status: 400 })
      }

      if (discountType === 'PERCENTAGE' && (discountAmount <= 0 || discountAmount > 100)) {
        return NextResponse.json({ 
          error: 'Percentage discount must be between 1-100' 
        }, { status: 400 })
      }

      if (discountType === 'FIXED_AMOUNT' && discountAmount >= product.price) {
        return NextResponse.json({ 
          error: 'Fixed discount cannot be equal to or greater than product price' 
        }, { status: 400 })
      }
    }

    // Update product with discount information
    const updateData: any = {
      hasDiscount,
      discountType: hasDiscount ? discountType as DiscountType : null,
      discountAmount: hasDiscount ? parseFloat(discountAmount) : null,
      discountStartDate: hasDiscount ? new Date(discountStartDate) : null,
      discountEndDate: hasDiscount ? new Date(discountEndDate) : null
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData
    })

    // Manage DISCOUNTED tag
    if (hasDiscount) {
      // Add DISCOUNTED tag
      await prisma.productTag.upsert({
        where: {
          productId_tag: {
            productId: id,
            tag: 'DISCOUNTED'
          }
        },
        update: {},
        create: {
          productId: id,
          tag: 'DISCOUNTED'
        }
      })
    } else {
      // Remove DISCOUNTED tag
      await prisma.productTag.deleteMany({
        where: {
          productId: id,
          tag: 'DISCOUNTED'
        }
      })
    }

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Product discount update error:', error)
    return NextResponse.json({ error: 'Failed to update product discount' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the product first to verify ownership
    const product = await prisma.product.findUnique({
      where: { id },
      include: { seller: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if user owns this product (unless admin)
    if (user.role !== 'ADMIN' && product.sellerId !== user.id) {
      return NextResponse.json({ error: 'You can only manage discounts for your own products' }, { status: 403 })
    }

    // Remove discount from product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        hasDiscount: false,
        discountType: null,
        discountAmount: null,
        discountStartDate: null,
        discountEndDate: null
      }
    })

    // Remove DISCOUNTED tag
    await prisma.productTag.deleteMany({
      where: {
        productId: id,
        tag: 'DISCOUNTED'
      }
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Product discount removal error:', error)
    return NextResponse.json({ error: 'Failed to remove product discount' }, { status: 500 })
  }
}
