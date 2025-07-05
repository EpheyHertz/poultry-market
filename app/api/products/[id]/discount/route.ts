
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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

    const { hasDiscount, discountType, discountAmount, discountStartDate, discountEndDate } = await request.json()

    const updateData: any = {
      hasDiscount,
      discountType: hasDiscount ? discountType : null,
      discountAmount: hasDiscount ? parseFloat(discountAmount) : null,
      discountStartDate: hasDiscount ? new Date(discountStartDate) : null,
      discountEndDate: hasDiscount ? new Date(discountEndDate) : null
    }

    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: updateData
    })

    // Add/remove DISCOUNTED tag
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
