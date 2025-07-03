import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
    
    if (user.role === 'SELLER' || user.role === 'COMPANY') {
      where.createdById = user.id
    }
    
    if (active === 'true') {
      where.isActive = true
      where.validUntil = {
        gte: new Date()
      }
      where.usedCount = {
        lt: prisma.voucher.fields.maxUses
      }
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
    
    if (!user || (user.role !== 'SELLER' && user.role !== 'COMPANY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, discount, type, validFrom, validUntil, maxUses } = await request.json()

    // Check if voucher code already exists
    const existingVoucher = await prisma.voucher.findUnique({
      where: { code }
    })

    if (existingVoucher) {
      return NextResponse.json({ 
        error: 'Voucher code already exists' 
      }, { status: 400 })
    }

    const voucher = await prisma.voucher.create({
      data: {
        code,
        discount: parseFloat(discount),
        type,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        maxUses: parseInt(maxUses),
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