import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/checkout - Create checkout session
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, quantity = 1, paymentType = 'BEFORE_DELIVERY' } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }

    // Get the product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: { id: true, name: true, role: true, dashboardSlug: true }
        }
      }
    })

    if (!product || !product.isActive) {
      return NextResponse.json({ 
        error: 'Product is no longer available' 
      }, { status: 400 })
    }

    if (product.stock < quantity) {
      return NextResponse.json({ 
        error: `Only ${product.stock} units available for ${product.name}` 
      }, { status: 400 })
    }

    // Calculate price (with discount if applicable)
    let currentPrice = product.price
    const now = new Date()

    if (product.hasDiscount && 
        product.discountStartDate && 
        product.discountEndDate &&
        product.discountAmount) {
      
      const startDate = new Date(product.discountStartDate)
      const endDate = new Date(product.discountEndDate)

      if (now >= startDate && now <= endDate) {
        if (product.discountType === 'PERCENTAGE') {
          currentPrice = product.price * (1 - product.discountAmount / 100)
        } else if (product.discountType === 'FIXED_AMOUNT') {
          currentPrice = Math.max(0, product.price - product.discountAmount)
        }
      }
    }

    const totalAmount = currentPrice * quantity

    // Create checkout session (expires in 1 hour)
    const checkoutSession = await prisma.checkoutSession.create({
      data: {
        userId: user.id,
        productId: product.id,
        quantity,
        totalAmount,
        paymentType: paymentType as any,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                role: true,
                dashboardSlug: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      checkoutSession,
      message: 'Checkout session created successfully'
    })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 })
  }
}
