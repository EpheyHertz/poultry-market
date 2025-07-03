import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { PaymentMethod, PaymentStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (user.role === 'CUSTOMER') {
      where.userId = user.id
    } else if (user.role === 'SELLER' || user.role === 'COMPANY') {
      where.order = {
        items: {
          some: {
            product: {
              sellerId: user.id
            }
          }
        }
      }
    }
    
    if (orderId) {
      where.orderId = orderId
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where })
    ])

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Payments fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, method, phoneNumber, transactionCode, mpesaMessage } = await request.json()

    // Verify order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: user.id
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId }
    })

    if (existingPayment) {
      return NextResponse.json({ error: 'Payment already exists for this order' }, { status: 400 })
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        userId: user.id,
        amount: order.total,
        method: method as PaymentMethod,
        phoneNumber,
        transactionCode,
        mpesaMessage,
        referenceNumber: `PAY${Date.now()}`,
        status: method === 'CASH_ON_DELIVERY' ? 'PENDING' : 'PENDING'
      },
      include: {
        order: true
      }
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}