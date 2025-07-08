
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { PaymentStatus, OrderStatus } from '@prisma/client'
import { createNotification, notificationTemplates } from '@/lib/notifications'

interface RouteParams {
  params: {
    orderId: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, notes } = await request.json()

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
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

    if (order.paymentStatus !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Payment not pending approval' }, { status: 400 })
    }

    const newPaymentStatus = action === 'APPROVE' ? PaymentStatus.APPROVED : PaymentStatus.REJECTED
    const newOrderStatus = action === 'APPROVE' ? OrderStatus.CONFIRMED : OrderStatus.CANCELLED

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: params.orderId },
        data: {
          paymentStatus: newPaymentStatus,
          status: newOrderStatus
        }
      })

      // Log the approval action
      await tx.paymentApprovalLog.create({
        data: {
          orderId: order.id,
          approverId: user.id,
          action: action,
          notes: notes || null
        }
      })

      // Create payment record if approved
      if (action === 'APPROVE') {
        await tx.payment.create({
          data: {
            orderId: order.id,
            userId: order.customerId,
            amount: order.total,
            method: order.paymentType as any,
            status: 'APPROVED',
            phoneNumber: order.paymentPhone,
            transactionCode: order.paymentReference,
            mpesaMessage: order.paymentDetails,
            referenceNumber: `PAY-${Date.now()}`
          }
        })
      }

      return updated
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

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Payment approval error:', error)
    return NextResponse.json({ error: 'Failed to process payment approval' }, { status: 500 })
  }
}
