
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { DiscountType } from '@prisma/client'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !['SELLER', 'COMPANY'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { 
      hasDiscount, 
      discountType, 
      discountAmount, 
      discountStartDate, 
      discountEndDate 
    } = await request.json()

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

      if (discountType === 'FIXED_AMOUNT' && discountAmount >= product.price) {
        return NextResponse.json({ 
          error: 'Fixed discount cannot be equal to or greater than product price' 
        }, { status: 400 })
      }
    }

    const updateData: any = {
      hasDiscount,
      discountType: hasDiscount ? discountType as DiscountType : null,
      discountAmount: hasDiscount ? parseFloat(discountAmount) : null,
      discountStartDate: hasDiscount ? new Date(discountStartDate) : null,
      discountEndDate: hasDiscount ? new Date(discountEndDate) : null
    }

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: updateData
    })

    // Manage DISCOUNTED tag
    if (hasDiscount) {
      await prisma.productTag.upsert({
        where: {
          productId_tag: {
            productId: product.id,
            tag: 'DISCOUNTED'
          }
        },
        update: {},
        create: {
          productId: product.id,
          tag: 'DISCOUNTED'
        }
      })
    } else {
      await prisma.productTag.deleteMany({
        where: {
          productId: product.id,
          tag: 'DISCOUNTED'
        }
      })
    }

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Product discount update error:', error)
    return NextResponse.json({ error: 'Failed to update discount' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !['SELLER', 'COMPANY'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove discount
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
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
        productId: product.id,
        tag: 'DISCOUNTED'
      }
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Product discount removal error:', error)
    return NextResponse.json({ error: 'Failed to remove discount' }, { status: 500 })
  }
}
