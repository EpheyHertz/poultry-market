import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { User } from '@prisma/client' // ✅ add this

export async function POST(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop() || ''
  try {
    const user = await getCurrentUser()

    if (!user || !['ADMIN', 'SELLER', 'COMPANY'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

const order = await prisma.order.findUnique({
  where: { id: id },
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
    delivery: true,
    customer: true
  }
})


    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.paymentStatus !== 'APPROVED') {
      return NextResponse.json({
        error: 'Cannot assign delivery to order with unapproved payment'
      }, { status: 400 })
    }

    const initialSellerIds = order.items.map(item => item.product.sellerId)
    const canAssign = user.role === 'ADMIN' || initialSellerIds.includes(user.id)

    if (!canAssign) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ✅ FIXED: properly typed assignedAgent
    let assignedAgent: User | null = null
    const customerLocation = order.delivery?.address || ''

    const seller = order.items[0]?.product.seller
    if (seller?.role === 'COMPANY') {
      // Skip for now
    }

    const availableAgents = await prisma.user.findMany({
      where: {
        role: 'DELIVERY_AGENT',
        isApproved: true,
        isActive: true
      },
      orderBy: { createdAt: 'asc' }
    })

    for (const agent of availableAgents) {
      if (
        agent.coverageArea &&
        customerLocation.toLowerCase().includes(agent.coverageArea.toLowerCase())
      ) {
        assignedAgent = agent
        break
      }
    }

    if (!assignedAgent && availableAgents.length > 0) {
      assignedAgent = availableAgents[0]
    }

    if (!assignedAgent) {
      return NextResponse.json({
        error: 'No available delivery agents found'
      }, { status: 400 })
    }

    const delivery = await prisma.delivery.upsert({
      where: { orderId: order.id },
      update: {
        agentId: assignedAgent.id,
        agentName: assignedAgent.name,
        agentPhone: assignedAgent.phone,
        vehicleInfo: `${assignedAgent.vehicleType} - ${assignedAgent.vehicleNumber}`,
        status: 'ASSIGNED'
      },
      create: {
        orderId: order.id,
        agentId: assignedAgent.id,
        address: customerLocation,
        trackingId: `TRK${Date.now()}`,
        agentName: assignedAgent.name,
        agentPhone: assignedAgent.phone,
        vehicleInfo: `${assignedAgent.vehicleType} - ${assignedAgent.vehicleNumber}`,
        status: 'ASSIGNED'
      }
    })

    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'DISPATCHED' }
    })

    const template = notificationTemplates.orderDispatched(
      order.id.slice(-8),
      delivery.trackingId,
      assignedAgent.name
    )
    await createNotification({
      receiverId: order.customerId,
      senderId: user.id,
      orderId: order.id,
      type: 'EMAIL',
      title: template.title,
      message: template.message
    })

    // Send SMS notification to customer
    await createNotification({
      receiverId: order.customerId,
      senderId: user.id,
      orderId: order.id,
      type: 'SMS',
      title: template.title,
      message: template.message
    })

    // Notify sellers that order has been dispatched
    const uniqueSellerIds = [...new Set(order.items.map(item => item.product.sellerId))]
    for (const sellerId of uniqueSellerIds) {
      await createNotification({
        receiverId: sellerId,
        senderId: user.id,
        orderId: order.id,
        type: 'EMAIL',
        title: 'Order Dispatched',
        message: `Your order #${order.id.slice(-8)} has been dispatched to the customer. Tracking ID: ${delivery.trackingId}`
      })
    }

    const agentTemplate = notificationTemplates.deliveryAssigned(
      order.id.slice(-8),
      order.customer.name
    )
    await createNotification({
      receiverId: assignedAgent.id,
      senderId: user.id,
      orderId: order.id,
      type: 'EMAIL',
      title: agentTemplate.title,
      message: agentTemplate.message
    })

    // Send SMS to delivery agent
    await createNotification({
      receiverId: assignedAgent.id,
      senderId: user.id,
      orderId: order.id,
      type: 'SMS',
      title: agentTemplate.title,
      message: agentTemplate.message
    })

    return NextResponse.json(delivery)
  } catch (error) {
    console.error('Delivery assignment error:', error)
    return NextResponse.json({ error: 'Failed to assign delivery' }, { status: 500 })
  }
}
