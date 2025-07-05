
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const delivery = await prisma.delivery.findUnique({
      where: {
        orderId: params.orderId
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
        },
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            vehicleType: true,
            vehicleNumber: true
          }
        }
      }
    })

    // Check permissions
    if (delivery) {
      const order = delivery.order
      const isCustomer = user.role === 'CUSTOMER' && order.customerId === user.id
      const isSeller = (user.role === 'SELLER' || user.role === 'COMPANY') && 
                      order.items.some(item => item.product.sellerId === user.id)
      const isAdmin = user.role === 'ADMIN'
      const isAgent = user.role === 'DELIVERY_AGENT' && delivery.agentId === user.id

      if (!isCustomer && !isSeller && !isAdmin && !isAgent) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ delivery })
  } catch (error) {
    console.error('Order delivery fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch delivery' }, { status: 500 })
  }
}
