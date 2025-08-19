import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { DeliveryStatus, OrderStatus } from '@prisma/client'

export async function PUT(
  request: NextRequest
) {
   const id = request.nextUrl.pathname.split('/').pop() || ''
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'DELIVERY_AGENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status, notes } = await request.json()

    const delivery = await prisma.delivery.findUnique({
      where: { 
        id: id,
        agentId: user.id // Ensure agent can only update their own deliveries
      },
      include: {
        order: {
          include: {
            customer: true
          }
        }
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      status: status as DeliveryStatus,
      deliveryNotes: notes
    }

    // Add timestamps based on status
    const now = new Date()
    switch (status) {
      case 'PICKED_UP':
        updateData.pickupTime = now
        break
      case 'IN_TRANSIT':
        updateData.dispatchTime = now
        break
      case 'DELIVERED':
        updateData.actualDelivery = now
        break
    }

    // Update delivery
    const updatedDelivery = await prisma.delivery.update({
      where: { id: id },
      data: updateData
    })

    // Update order status based on delivery status
    let orderStatus: OrderStatus | null = null
    switch (status) {
      case 'PICKED_UP':
        orderStatus = 'OUT_FOR_DELIVERY'
        break
      case 'DELIVERED':
        orderStatus = 'DELIVERED'
        break
    }

    if (orderStatus) {
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: orderStatus }
      })
    }

    // Send notification to customer
    let template
    switch (status) {
      case 'PICKED_UP':
        template = notificationTemplates.orderPickedUp(
          delivery.order.id.slice(-8),
          delivery.trackingId
        )
        break
      case 'IN_TRANSIT':
        template = notificationTemplates.orderInTransit(
          delivery.order.id.slice(-8),
          delivery.trackingId
        )
        break
      case 'OUT_FOR_DELIVERY':
        template = notificationTemplates.orderOutForDelivery(
          delivery.order.id.slice(-8),
          delivery.trackingId
        )
        break
      case 'DELIVERED':
        template = notificationTemplates.orderDelivered(delivery.order.id.slice(-8))
        break
    }

    if (template) {
      await createNotification({
        receiverId: delivery.order.customerId,
        senderId: user.id,
        orderId: delivery.orderId,
        type: 'EMAIL',
        title: template.title,
        message: template.message
      })

      // Send SMS notification as well
      await createNotification({
        receiverId: delivery.order.customerId,
        senderId: user.id,
        orderId: delivery.orderId,
        type: 'SMS',
        title: template.title,
        message: template.message
      })

      // Notify sellers about delivery status updates
      if (status === 'DELIVERED') {
        const order = await prisma.order.findUnique({
          where: { id: delivery.orderId },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        })

        if (order) {
          const sellerIds = [...new Set(order.items.map(item => item.product.sellerId))]
          for (const sellerId of sellerIds) {
            await createNotification({
              receiverId: sellerId,
              senderId: user.id,
              orderId: delivery.orderId,
              type: 'EMAIL',
              title: 'Order Delivered Successfully',
              message: `Order #${delivery.order.id.slice(-8)} has been delivered successfully to the customer.`
            })
          }
        }
      }
    }

    return NextResponse.json(updatedDelivery)
  } catch (error) {
    console.error('Delivery status update error:', error)
    return NextResponse.json({ error: 'Failed to update delivery status' }, { status: 500 })
  }
}