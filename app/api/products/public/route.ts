import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const type = searchParams.get('type')
  const category = searchParams.get('category')
  const location = searchParams.get('location')
  const customType = searchParams.get('customType')
  const singleTag = searchParams.get('tag')
  const tagsParam = searchParams.get('tags')
  const multiTagParams = searchParams.getAll('tag')
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

    if (customType) {
      where.customType = {
        equals: customType,
        mode: 'insensitive'
      }
    }

    if (category) {
      where.categories = {
        some: {
          category: {
            OR: [
              { slug: { equals: category, mode: 'insensitive' } },
              { id: category },
              { name: { equals: category, mode: 'insensitive' } }
            ]
          }
        }
      }
    }

    if (location) {
      where.seller = {
        is: {
          OR: [
            { location: { equals: location, mode: 'insensitive' } },
            { deliveryCounties: { has: location } },
            { deliveryProvinces: { has: location } }
          ]
        }
      }
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    // Tag filter (supports single and multiple tags)
    const combinedTags = new Set<string>()
    if (tagsParam) {
      tagsParam.split(',').filter(Boolean).forEach(tagValue => combinedTags.add(tagValue))
    }
    multiTagParams.forEach(tagValue => {
      if (tagValue) combinedTags.add(tagValue)
    })
    if (singleTag) {
      combinedTags.add(singleTag)
    }

    if (combinedTags.size > 0) {
      where.tags = {
        some: {
          tag: {
            in: Array.from(combinedTags)
          }
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

    const [types, customTypes, tags, categories, sellersWithLocations, priceRange] = await Promise.all([
      prisma.product.groupBy({
        by: ['type'],
        where: { isActive: true, stock: { gt: 0 } },
        _count: { type: true }
      }),
      prisma.product.groupBy({
        by: ['customType'],
        where: {
          isActive: true,
          stock: { gt: 0 },
          type: 'CUSTOM',
          customType: { not: null }
        },
        _count: { customType: true }
      }),
      prisma.productTag.groupBy({
        by: ['tag'],
        _count: { tag: true }
      }),
      prisma.category.findMany({
        where: {
          products: {
            some: {
              product: {
                isActive: true,
                stock: { gt: 0 }
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              products: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.product.findMany({
        where: {
          isActive: true,
          stock: { gt: 0 },
          seller: {
            isNot: {}
          }
        },
        distinct: ['sellerId'],
        select: {
          seller: {
            select: {
              location: true,
              deliveryCounties: true,
              deliveryProvinces: true
            }
          }
        }
      }),
      prisma.product.aggregate({
        where: { isActive: true },
        _min: { price: true },
        _max: { price: true }
      })
    ])

    const locationSet = new Set<string>()
    sellersWithLocations.forEach(entry => {
      const seller = entry.seller
      if (!seller) return

      if (seller.location) {
        locationSet.add(seller.location)
      }

      seller.deliveryCounties?.forEach(county => {
        if (county) locationSet.add(county)
      })

      seller.deliveryProvinces?.forEach(province => {
        if (province) locationSet.add(province)
      })
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
        types: [
          ...types
            .filter(typeEntry => typeEntry.type !== 'CUSTOM')
            .map(typeEntry => ({
              type: typeEntry.type,
              customType: null,
              count: typeEntry._count.type
            })),
          ...customTypes
            .filter(customEntry => customEntry.customType)
            .map(customEntry => ({
              type: 'CUSTOM',
              customType: customEntry.customType,
              count: customEntry._count.customType
            }))
        ],
        tags,
        categories,
        locations: Array.from(locationSet).sort((a, b) => a.localeCompare(b)),
        priceRange
      }
    })
  } catch (error) {
    console.error('Public products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}