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

    const where: any = {
      paymentStatus: 'PENDING'
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          items: {
            include: {
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
          // Ensure payment is included with all fields
          payment: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true
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

    // Format the response to ensure payment details are included
    const formattedOrders = orders.map(order => {
      // Check if payment exists but wasn't properly included
      let paymentDetails = order.payment
      if (!paymentDetails) {
        // If payment is null but paymentStatus is PENDING, there might be a data inconsistency
        console.warn(`Order ${order.id} has paymentStatus PENDING but no payment record`)
      }

      return {
        id: order.id,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentType: order.paymentType,
        total: order.total,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        voucherCode: order.voucherCode,
        notes: order.notes,
        rejectionReason: order.rejectionReason,
        customer: order.customer,
        items: order.items.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discountApplied: item.discountApplied,
          product: {
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            type: item.product.type
          }
        })),
        payment: paymentDetails ? {
          id: paymentDetails.id,
          amount: paymentDetails.amount,
          method: paymentDetails.method,
          status: paymentDetails.status,
          phoneNumber: paymentDetails.phoneNumber,
          transactionCode: paymentDetails.transactionCode,
          mpesaMessage: paymentDetails.mpesaMessage,
          referenceNumber: paymentDetails.referenceNumber,
          createdAt: paymentDetails.createdAt,
          updatedAt: paymentDetails.updatedAt,
          payer: paymentDetails.user
        } : null,
        delivery: order.delivery,
        paymentApprovals: order.paymentApprovals,
        // Legacy fields
        paymentDetails: paymentDetails ? {
          phone: paymentDetails.phoneNumber,
          reference: paymentDetails.referenceNumber,
          message: paymentDetails.mpesaMessage,
          code: paymentDetails.transactionCode
        } : null,
        paymentPhone: paymentDetails?.phoneNumber || null,
        paymentReference: paymentDetails?.referenceNumber || null
      }
    })
    console.log('Fetched pending payments:', formattedOrders)

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Failed to fetch payment approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment approvals', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}