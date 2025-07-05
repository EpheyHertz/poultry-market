
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'DELIVERY_AGENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deliveries = await prisma.delivery.findMany({
      where: {
        agentId: null,
        status: 'ASSIGNED'
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true
              }
            },
            items: {
              include: {
                product: {
                  include: {
                    seller: {
                      select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ deliveries })
  } catch (error) {
    console.error('Unassigned deliveries fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch unassigned deliveries' }, { status: 500 })
  }
}
