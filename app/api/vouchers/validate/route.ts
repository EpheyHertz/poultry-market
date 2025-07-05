import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, orderTotal, productTypes } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Voucher code is required' }, { status: 400 })
    }

    // Find voucher
    const voucher = await prisma.voucher.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!voucher) {
      return NextResponse.json({ 
        error: 'Invalid voucher code',
        valid: false 
      }, { status: 400 })
    }

    // Check if voucher is active
    if (!voucher.isActive) {
      return NextResponse.json({ 
        error: 'Voucher is no longer active',
        valid: false 
      }, { status: 400 })
    }

    // Check date validity
    const now = new Date()
    if (now < voucher.validFrom || now > voucher.validUntil) {
      return NextResponse.json({ 
        error: 'Voucher has expired or is not yet valid',
        valid: false 
      }, { status: 400 })
    }

    // Check usage limit
    if (voucher.usedCount >= voucher.maxUses) {
      return NextResponse.json({ 
        error: 'Voucher usage limit reached',
        valid: false 
      }, { status: 400 })
    }

    // Check minimum order amount
    if (orderTotal < voucher.minOrderAmount) {
      return NextResponse.json({ 
        error: `Minimum order amount is $${voucher.minOrderAmount}`,
        valid: false 
      }, { status: 400 })
    }

    // Check role restrictions
    if (voucher.applicableRoles.length > 0 && !voucher.applicableRoles.includes(user.role)) {
      return NextResponse.json({ 
        error: 'Voucher not applicable for your account type',
        valid: false 
      }, { status: 400 })
    }

    // Check product type restrictions
    if (voucher.applicableProductTypes.length > 0 && productTypes) {
      const hasApplicableProduct = productTypes.some((type: string) => 
        voucher.applicableProductTypes.includes(type)
      )
      
      if (!hasApplicableProduct) {
        return NextResponse.json({ 
          error: 'Voucher not applicable for products in your cart',
          valid: false 
        }, { status: 400 })
      }
    }

    // Calculate discount amount
    let discountAmount = 0
    
    if (voucher.discountType === 'PERCENTAGE') {
      discountAmount = (orderTotal * voucher.discountValue) / 100
    } else if (voucher.discountType === 'FIXED_AMOUNT') {
      discountAmount = voucher.discountValue
    }

    // Apply maximum discount limit
    if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
      discountAmount = voucher.maxDiscountAmount
    }

    // Ensure discount doesn't exceed order total
    discountAmount = Math.min(discountAmount, orderTotal)

    return NextResponse.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue
      },
      discountAmount,
      finalTotal: orderTotal - discountAmount
    })
  } catch (error) {
    console.error('Voucher validation error:', error)
    return NextResponse.json({ error: 'Failed to validate voucher' }, { status: 500 })
  }
}