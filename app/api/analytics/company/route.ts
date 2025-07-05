
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'COMPANY') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '30')
    
    const currentPeriodStart = new Date()
    currentPeriodStart.setDate(currentPeriodStart.getDate() - period)
    
    const previousPeriodStart = new Date()
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (period * 2))
    
    const previousPeriodEnd = new Date()
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - period)

    // Current period analytics
    const [
      currentRevenue,
      currentOrders,
      previousRevenue,
      previousOrders,
      activeProducts,
      outOfStock,
      topProducts,
      recentOrders,
      customerAnalytics,
      sponsorshipAnalytics
    ] = await Promise.all([
      // Current period revenue
      prisma.order.aggregate({
        where: {
          items: {
            some: {
              product: {
                sellerId: user.id
              }
            }
          },
          status: 'DELIVERED',
          createdAt: {
            gte: currentPeriodStart
          }
        },
        _sum: {
          total: true
        },
        _count: true
      }),

      // Current period orders
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
            gte: currentPeriodStart
          }
        }
      }),

      // Previous period revenue
      prisma.order.aggregate({
        where: {
          items: {
            some: {
              product: {
                sellerId: user.id
              }
            }
          },
          status: 'DELIVERED',
          createdAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd
          }
        },
        _sum: {
          total: true
        }
      }),

      // Previous period orders
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
            gte: previousPeriodStart,
            lt: previousPeriodEnd
          }
        }
      }),

      // Active products
      prisma.product.count({
        where: {
          sellerId: user.id,
          stock: {
            gt: 0
          }
        }
      }),

      // Out of stock products
      prisma.product.count({
        where: {
          sellerId: user.id,
          stock: 0
        }
      }),

      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          product: {
            sellerId: user.id
          },
          order: {
            createdAt: {
              gte: currentPeriodStart
            }
          }
        },
        _sum: {
          quantity: true,
          price: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 5
      }),

      // Recent orders
      prisma.order.findMany({
        where: {
          items: {
            some: {
              product: {
                sellerId: user.id
              }
            }
          },
          createdAt: {
            gte: currentPeriodStart
          }
        },
        include: {
          customer: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Customer analytics
      prisma.order.findMany({
        where: {
          items: {
            some: {
              product: {
                sellerId: user.id
              }
            }
          },
          createdAt: {
            gte: currentPeriodStart
          }
        },
        select: {
          customerId: true,
          createdAt: true
        }
      }),

      // Sponsorship analytics
      Promise.all([
        prisma.sponsorship.count({
          where: {
            companyId: user.id,
            status: 'ACTIVE'
          }
        }),
        prisma.sponsorshipApplication.count({
          where: {
            sponsorship: {
              companyId: user.id
            },
            status: 'PENDING'
          }
        }),
        prisma.sponsorship.aggregate({
          where: {
            companyId: user.id,
            status: 'ACTIVE'
          },
          _sum: {
            amount: true
          }
        })
      ])
    ])

    // Get product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { 
            id: true,
            name: true, 
            price: true, 
            type: true 
          }
        })
        return {
          ...product,
          totalSold: item._sum.quantity,
          revenue: item._sum.price
        }
      })
    )

    // Calculate customer analytics
    const uniqueCustomers = [...new Set(customerAnalytics.map(order => order.customerId))]
    const customerOrderCounts = customerAnalytics.reduce((acc, order) => {
      acc[order.customerId] = (acc[order.customerId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const newCustomers = Object.values(customerOrderCounts).filter(count => count === 1).length
    const returningCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length

    // Calculate percentage changes
    const currentRevenueAmount = currentRevenue._sum.total || 0
    const previousRevenueAmount = previousRevenue._sum.total || 0
    const revenueChange = previousRevenueAmount > 0 
      ? ((currentRevenueAmount - previousRevenueAmount) / previousRevenueAmount) * 100 
      : 0

    const ordersChange = previousOrders > 0 
      ? ((currentOrders - previousOrders) / previousOrders) * 100 
      : 0

    const avgOrderValue = currentOrders > 0 ? currentRevenueAmount / currentOrders : 0
    const previousAvgOrderValue = previousOrders > 0 ? previousRevenueAmount / previousOrders : 0
    const aovChange = previousAvgOrderValue > 0 
      ? ((avgOrderValue - previousAvgOrderValue) / previousAvgOrderValue) * 100 
      : 0

    const analytics = {
      totalRevenue: currentRevenueAmount,
      totalOrders: currentOrders,
      revenueChange,
      ordersChange,
      avgOrderValue,
      aovChange,
      activeProducts,
      outOfStock,
      topProducts: topProductsWithDetails,
      recentOrders,
      newCustomers,
      returningCustomers,
      totalCustomers: uniqueCustomers.length,
      avgOrdersPerCustomer: uniqueCustomers.length > 0 
        ? customerAnalytics.length / uniqueCustomers.length 
        : 0,
      activeSponsorships: sponsorshipAnalytics[0],
      pendingApplications: sponsorshipAnalytics[1],
      totalSponsorshipInvestment: sponsorshipAnalytics[2]._sum.amount || 0
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Company analytics fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
