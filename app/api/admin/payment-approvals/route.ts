import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // First fetch orders with basic information
    const orders = await prisma.order.findMany({
      where: { paymentStatus: { in: ['PENDING', 'SUBMITTED', 'UNPAID','APPROVED','REJECTED'] } },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        paymentStatus: true,
        paymentType: true,
        total: true,
        subtotal: true,
        discountAmount: true,
        voucherCode: true,
        notes: true,
        rejectionReason: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            price: true,
            discountApplied: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                type: true
              }
            }
          }
        },
        delivery: {
          select: {
            status: true,
            fee: true,
            agent: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            }
          }
        },
        paymentApprovals: {
          select: {
            id: true,
            action: true,
            notes: true,
            createdAt: true,
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
    })

    // Get the count of pending orders
    const total = await prisma.order.count({ 
      where: { paymentStatus: 'PENDING' }
    })

    // Fetch payments separately for these orders
    const payments = await prisma.payment.findMany({
      where: {
        orderId: {
          in: orders.map(order => order.id)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    })

    // Create a map for quick payment lookup by orderId
    const paymentMap = new Map(
      payments.map(payment => [payment.orderId, payment])
    )

    // Merge orders with their payments
    const ordersWithPayments = orders.map(order => {
      const payment = paymentMap.get(order.id)
      
      return {
        ...order,
        payment: payment ? {
          id: payment.id,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          phoneNumber: payment.phoneNumber,
          transactionCode: payment.transactionCode,
          mpesaMessage: payment.mpesaMessage,
          referenceNumber: payment.referenceNumber,
          description: payment.description,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          payer: payment.user
        } : null,
        // Legacy fields for backward compatibility
        paymentDetails: payment ? {
          phone: payment.phoneNumber,
          reference: payment.referenceNumber,
          message: payment.mpesaMessage,
          code: payment.transactionCode
        } : null,
        paymentPhone: payment?.phoneNumber || null,
        paymentReference: payment?.referenceNumber || null
      }
    })
    // console.log('Orders with payments:', ordersWithPayments)

    return NextResponse.json({
      orders: ordersWithPayments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Failed to fetch pending payments:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch pending payments',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}