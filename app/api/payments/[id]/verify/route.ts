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

    const { status } = await request.json()

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: {
            customer: true
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: params.id },
      data: { status }
    })

    // If payment confirmed, update order status
    if (status === 'CONFIRMED') {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'CONFIRMED' }
      })

      // Send notification
      const template = notificationTemplates.orderConfirmed(payment.order.id.slice(-8))
      await createNotification({
        receiverId: payment.order.customerId,
        orderId: payment.orderId,
        type: 'EMAIL',
        title: template.title,
        message: template.message
      })
    }

    return NextResponse.json(updatedPayment)
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}