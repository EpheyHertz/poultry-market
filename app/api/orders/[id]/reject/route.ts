import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createNotification, notificationTemplates } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reason } = await request.json()

    if (!reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason
      }
    })

    // Restore product stock
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity
          }
        }
      })
    }

    // Notify customer
    const template = notificationTemplates.orderRejected(order.id.slice(-8), reason)
    await createNotification({
      receiverId: order.customerId,
      senderId: user.id,
      orderId: order.id,
      type: 'EMAIL',
      title: template.title,
      message: template.message
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Order rejection error:', error)
    return NextResponse.json({ error: 'Failed to reject order' }, { status: 500 })
  }
}