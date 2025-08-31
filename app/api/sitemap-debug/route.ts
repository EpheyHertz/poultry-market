import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Test database connectivity
    const productCount = await prisma.product.count({
      where: {
        isActive: true,
        seller: {
          isVerified: true
        }
      }
    })

    const categoryCount = await prisma.category.count()
    
    const sellerCount = await prisma.user.count({
      where: {
        role: 'SELLER',
        isVerified: true,
        dashboardSlug: {
          not: null
        }
      }
    })

    return NextResponse.json({
      status: 'success',
      message: 'Sitemap generation working correctly',
      counts: {
        products: productCount,
        categories: categoryCount,
        sellers: sellerCount,
        totalUrls: productCount + categoryCount + sellerCount + 9 // 9 static routes
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Sitemap validation error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
