import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { PaymentStatus, OrderStatus } from '@prisma/client'
import { createNotification, notificationTemplates } from '@/lib/notifications'

export async function POST(
  request: NextRequest
) {
   const id = request.nextUrl.pathname.split('/').pop() || ''
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, notes } = await request.json()

    // Get the order with items
    const order = await prisma.order.findUnique({
      where: { id: id },
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

    // Check if user has permission to approve payment
    const sellerIds = order.items.map(item => item.product.sellerId)
    const canApprove = user.role === 'ADMIN' || sellerIds.includes(user.id)

    if (!canApprove) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update payment status
    const newPaymentStatus = action === 'APPROVE' ? PaymentStatus.APPROVED : PaymentStatus.REJECTED
    const newOrderStatus = action === 'APPROVE' ? OrderStatus.APPROVED : order.status

    const updatedOrder = await prisma.order.update({
      where: { id: id },
      data: {
        paymentStatus: newPaymentStatus,
        status: newOrderStatus
      }
    })

    // Log the approval action
    await prisma.paymentApprovalLog.create({
      data: {
        orderId: order.id,
        approverId: user.id,
        action: action,
        notes: notes || null
      }
    })

    // Send notification to customer
    const template = action === 'APPROVE' 
      ? notificationTemplates.paymentApproved(order.id.slice(-8))
      : notificationTemplates.paymentRejected(order.id.slice(-8), notes)

    await createNotification({
      receiverId: order.customerId,
      senderId: user.id,
      orderId: order.id,
      type: 'EMAIL',
      title: template.title,
      message: template.message
    })

    // Send notification to SMS as well
    await createNotification({
      receiverId: order.customerId,
      senderId: user.id,
      orderId: order.id,
      type: 'SMS',
      title: template.title,
      message: template.message
    })

    // If payment approved, notify sellers to prepare order
    if (action === 'APPROVE') {
      const sellerIds = [...new Set(order.items.map(item => item.product.sellerId))]
      for (const sellerId of sellerIds) {
        await createNotification({
          receiverId: sellerId,
          senderId: user.id,
          orderId: order.id,
          type: 'EMAIL',
          title: 'Payment Approved - Prepare Order',
          message: `Payment has been approved for order #${order.id.slice(-8)}. Please prepare the order for dispatch.`
        })
      }
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Payment approval error:', error)
    return NextResponse.json({ error: 'Failed to process payment approval' }, { status: 500 })
  }
}