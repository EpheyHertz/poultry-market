import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { VoucherType, UserRole, ProductType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    
    // Role-based filtering
    if (user.role === 'SELLER' || user.role === 'COMPANY') {
      where.createdById = user.id
    } else if (user.role === 'CUSTOMER') {
      // Customers can only see active vouchers they can use
      where.isActive = true
      where.validUntil = { gte: new Date() }
      where.OR = [
        { applicableRoles: { has: user.role } },
        { applicableRoles: { isEmpty: true } }
      ]
    }
    
    if (active === 'true') {
      where.isActive = true
      where.validUntil = { gte: new Date() }
      where.usedCount = { lt: prisma.voucher.fields.maxUses }
    }

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.voucher.count({ where })
    ])

    return NextResponse.json({
      vouchers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Vouchers fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch vouchers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      code, 
      name,
      description,
      discountType, 
      discountValue, 
      minOrderAmount,
      maxDiscountAmount,
      validFrom, 
      validUntil, 
      maxUses,
      applicableRoles,
      applicableProductTypes
    } = await request.json()

    // Validate required fields
    if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if voucher code already exists
    const existingVoucher = await prisma.voucher.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (existingVoucher) {
      return NextResponse.json({ 
        error: 'Voucher code already exists' 
      }, { status: 400 })
    }

    // Validate dates
    const startDate = new Date(validFrom)
    const endDate = new Date(validUntil)
    
    if (endDate <= startDate) {
      return NextResponse.json({ 
        error: 'End date must be after start date' 
      }, { status: 400 })
    }

    const voucher = await prisma.voucher.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        discountType: discountType as VoucherType,
        discountValue: parseFloat(discountValue),
        minOrderAmount: parseFloat(minOrderAmount || 0),
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        validFrom: startDate,
        validUntil: endDate,
        maxUses: parseInt(maxUses || 1),
        applicableRoles: applicableRoles || [],
        applicableProductTypes: applicableProductTypes || [],
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json(voucher)
  } catch (error) {
    console.error('Voucher creation error:', error)
    return NextResponse.json({ error: 'Failed to create voucher' }, { status: 500 })
  }
}