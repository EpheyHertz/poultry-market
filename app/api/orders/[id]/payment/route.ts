import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { PaymentStatus } from '@prisma/client'
import { createNotification, notificationTemplates } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone, reference, mpesaMessage } = await request.json()

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                seller: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user is the customer or has permission
    if (user.role === 'CUSTOMER' && order.customerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update order with payment details
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        paymentPhone: phone,
        paymentReference: reference,
        paymentDetails: mpesaMessage,
        paymentStatus: PaymentStatus.SUBMITTED
      }
    })

    // Notify sellers/companies about payment submission
    const sellerIds = [...new Set(order.items.map(item => item.product.sellerId))]
    
    for (const sellerId of sellerIds) {
      const template = notificationTemplates.paymentSubmitted(order.id.slice(-8))
      await createNotification({
        receiverId: sellerId,
        senderId: user.id,
        orderId: order.id,
        type: 'EMAIL',
        title: template.title,
        message: template.message
      })
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Payment submission error:', error)
    return NextResponse.json({ error: 'Failed to submit payment' }, { status: 500 })
  }
}