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
    
    if (!user || !['ADMIN', 'SELLER', 'COMPANY'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        },
        delivery: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check permissions
    const sellerIds = order.items.map(item => item.product.sellerId)
    const canAssign = user.role === 'ADMIN' || sellerIds.includes(user.id)

    if (!canAssign) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Auto-assignment logic
    let assignedAgent = null
    const customerLocation = order.delivery?.address || ''

    // 1. Try to find seller's preferred agent (if seller has internal delivery)
    const seller = order.items[0]?.product.seller
    if (seller?.role === 'COMPANY') {
      // Companies might have internal delivery teams
      // For now, we'll use the general assignment logic
    }

    // 2. Find nearest approved agent by coverage area
    if (!assignedAgent) {
      const availableAgents = await prisma.user.findMany({
        where: {
          role: 'DELIVERY_AGENT',
          isApproved: true,
          isActive: true
        },
        orderBy: { createdAt: 'asc' } // Simple FIFO for now
      })

      // Simple matching by coverage area (in production, use proper geolocation)
      for (const agent of availableAgents) {
        if (agent.coverageArea && 
            customerLocation.toLowerCase().includes(agent.coverageArea.toLowerCase())) {
          assignedAgent = agent
          break
        }
      }

      // 3. Fallback to any available agent
      if (!assignedAgent && availableAgents.length > 0) {
        assignedAgent = availableAgents[0]
      }
    }

    if (!assignedAgent) {
      return NextResponse.json({ 
        error: 'No available delivery agents found' 
      }, { status: 400 })
    }

    // Update or create delivery record
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

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'DISPATCHED' }
    })

    // Notify customer
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

    // Notify delivery agent
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

    return NextResponse.json(delivery)
  } catch (error) {
    console.error('Delivery assignment error:', error)
    return NextResponse.json({ error: 'Failed to assign delivery' }, { status: 500 })
  }
}