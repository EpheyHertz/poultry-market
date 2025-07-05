import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'DELIVERY_AGENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {
      agentId: user.id
    }

    if (status) {
      where.status = status
    }

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true
                }
              },
              items: {
                include: {
                  product: {
                    select: {
                      name: true,
                      type: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.delivery.count({ where })
    ])

    return NextResponse.json({
      deliveries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Agent deliveries fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 })
  }
}