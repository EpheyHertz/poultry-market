import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { ProductType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const sellerId = searchParams.get('sellerId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (type) {
      where.type = type as ProductType
    }
    
    if (sellerId) {
      where.sellerId = sellerId
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              role: true,
              dashboardSlug: true,
              tags: {
                select: {
                  tag: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where })
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'SELLER' && user.role !== 'COMPANY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, price, stock, type, images } = await request.json()

    // Validate product type based on user role
    if (user.role === 'SELLER') {
      const allowedTypes = ['EGGS', 'CHICKEN_MEAT']
      if (!allowedTypes.includes(type)) {
        return NextResponse.json({ 
          error: 'Sellers can only sell eggs and chicken meat' 
        }, { status: 400 })
      }
    } else if (user.role === 'COMPANY') {
      const allowedTypes = ['CHICKEN_FEED', 'CHICKS', 'HATCHING_EGGS']
      if (!allowedTypes.includes(type)) {
        return NextResponse.json({ 
          error: 'Companies can only sell chicken feed, chicks, and hatching eggs' 
        }, { status: 400 })
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        type: type as ProductType,
        images: images || [],
        sellerId: user.id,
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

    // Notify admin about new product
    try {
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      })

      for (const admin of adminUsers) {
        await createNotification({
          receiverId: admin.id,
          senderId: user.id,
          type: 'EMAIL',
          title: 'New Product Created',
          message: `A new product "${name}" has been created by ${user.name}. Please review it in the admin panel.`
        })
      }
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError)
      // Don't fail product creation if notification fails
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}