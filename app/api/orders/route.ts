import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { OrderStatus, PaymentType, PaymentStatus, DeliveryStatus } from '@prisma/client'
import { createNotification, notificationTemplates } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (user.role === 'CUSTOMER') {
      where.customerId = user.id
    } else if (user.role === 'SELLER' || user.role === 'COMPANY') {
      where.items = {
        some: {
          product: {
            sellerId: user.id
          }
        }
      }
    }
    
    if (status) {
      where.status = status as OrderStatus
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
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
                      role: true
                    }
                  }
                }
              }
            }
          },
          delivery: true,
          paymentApprovals: {
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where })
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { items, deliveryAddress, paymentType, paymentDetails } = await request.json()

    // Validate items and calculate total
    let total = 0
    const orderItems = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })

      if (!product) {
        return NextResponse.json({ 
          error: `Product ${item.productId} not found` 
        }, { status: 400 })
      }

      if (product.stock < item.quantity) {
        return NextResponse.json({ 
          error: `Insufficient stock for ${product.name}` 
        }, { status: 400 })
      }

      const itemTotal = product.price * item.quantity
      total += itemTotal

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      })
    }

    // Determine initial order status based on payment type
    const initialStatus = paymentType === 'BEFORE_DELIVERY' ? OrderStatus.PENDING : OrderStatus.CONFIRMED
    const initialPaymentStatus = paymentType === 'BEFORE_DELIVERY' ? PaymentStatus.UNPAID : PaymentStatus.PENDING

    // Create order with items
    const order = await prisma.order.create({
      data: {
        customerId: user.id,
        total,
        status: initialStatus,
        paymentType: paymentType as PaymentType,
        paymentStatus: initialPaymentStatus,
        paymentDetails: paymentDetails?.details || null,
        paymentPhone: paymentDetails?.phone || null,
        paymentReference: paymentDetails?.reference || null,
        items: {
          create: orderItems
        },
        delivery: deliveryAddress ? {
          create: {
            address: deliveryAddress,
            trackingId: `TRK${Date.now()}`,
            status:DeliveryStatus.ASSIGNED
          }
        } : undefined
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: true
              }
            }
          }
        },
        delivery: true
      }
    })

    // Update product stock
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      })
    }

    // Send notifications to sellers/companies
    const sellerIds = [...new Set(order.items.map(item => item.product.sellerId))]
    
    for (const sellerId of sellerIds) {
      const template = notificationTemplates.newOrder(order.id.slice(-8), paymentType)
      await createNotification({
        receiverId: sellerId,
        senderId: user.id,
        orderId: order.id,
        type: 'EMAIL',
        title: template.title,
        message: template.message
      })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}