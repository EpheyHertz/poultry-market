import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'SELLER' && user.role !== 'COMPANY' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    let analytics: any = {}

    if (user.role === 'ADMIN') {
      // Admin analytics - system-wide
      const [totalUsers, totalOrders, totalRevenue, recentOrders] = await Promise.all([
        prisma.user.count(),
        prisma.order.count({
          where: {
            createdAt: {
              gte: startDate
            }
          }
        }),
        prisma.order.aggregate({
          where: {
            status: 'DELIVERED',
            createdAt: {
              gte: startDate
            }
          },
          _sum: {
            total: true
          }
        }),
        prisma.order.findMany({
          where: {
            createdAt: {
              gte: startDate
            }
          },
          include: {
            customer: {
              select: {
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ])

      analytics = {
        totalUsers,
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        recentOrders
      }
    } else {
      // Seller/Company analytics
      const [totalSales, orderCount, products, topProducts] = await Promise.all([
        prisma.order.aggregate({
          where: {
            status: 'DELIVERED',
            items: {
              some: {
                product: {
                  sellerId: user.id
                }
              }
            },
            createdAt: {
              gte: startDate
            }
          },
          _sum: {
            total: true
          }
        }),
        prisma.order.count({
          where: {
            items: {
              some: {
                product: {
                  sellerId: user.id
                }
              }
            },
            createdAt: {
              gte: startDate
            }
          }
        }),
        prisma.product.count({
          where: { sellerId: user.id }
        }),
        prisma.orderItem.groupBy({
          by: ['productId'],
          where: {
            product: {
              sellerId: user.id
            },
            order: {
              createdAt: {
                gte: startDate
              }
            }
          },
          _sum: {
            quantity: true
          },
          orderBy: {
            _sum: {
              quantity: 'desc'
            }
          },
          take: 5
        })
      ])

      // Get product details for top products
      const topProductsWithDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true, price: true }
          })
          return {
            ...product,
            totalSold: item._sum.quantity
          }
        })
      )

      analytics = {
        totalSales: totalSales._sum.total || 0,
        orderCount,
        productCount: products,
        topProducts: topProductsWithDetails,
        fulfillmentRate: 95 // This would be calculated based on actual delivery data
      }
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}