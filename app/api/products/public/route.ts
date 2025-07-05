import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const type = searchParams.get('type')
    const tag = searchParams.get('tag')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    const where: any = {
      isActive: true,
      stock: { gt: 0 }
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { metaTitle: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Type filter
    if (type) {
      where.type = type
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    // Tag filter
    if (tag) {
      where.tags = {
        some: {
          tag: tag
        }
      }
    }

    // Build orderBy
    const orderBy: any = {}
    if (sortBy === 'price') {
      orderBy.price = sortOrder
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder
    } else {
      orderBy.createdAt = sortOrder
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
          },
          tags: {
            select: {
              tag: true
            }
          },
          reviews: {
            select: {
              rating: true
            }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where })
    ])

    // Calculate average ratings and apply discounts
    const productsWithDetails = products.map(product => {
      const avgRating = product.reviews.length > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0

      // Calculate current price with discount
      let currentPrice = product.price
      let isDiscounted = false

      if (product.hasDiscount && 
          product.discountStartDate && 
          product.discountEndDate &&
          new Date() >= product.discountStartDate && 
          new Date() <= product.discountEndDate) {
        isDiscounted = true
        if (product.discountType === 'PERCENTAGE') {
          currentPrice = product.price * (1 - (product.discountAmount || 0) / 100)
        } else {
          currentPrice = Math.max(0, product.price - (product.discountAmount || 0))
        }
      }

      return {
        ...product,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: product.reviews.length,
        currentPrice,
        originalPrice: product.price,
        isDiscounted,
        discountPercentage: isDiscounted && product.discountType === 'PERCENTAGE' 
          ? product.discountAmount 
          : null
      }
    })

    return NextResponse.json({
      products: productsWithDetails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        types: await prisma.product.groupBy({
          by: ['type'],
          where: { isActive: true },
          _count: { type: true }
        }),
        tags: await prisma.productTag.groupBy({
          by: ['tag'],
          _count: { tag: true }
        }),
        priceRange: await prisma.product.aggregate({
          where: { isActive: true },
          _min: { price: true },
          _max: { price: true }
        })
      }
    })
  } catch (error) {
    console.error('Public products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}