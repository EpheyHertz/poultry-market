
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'DELIVERY_AGENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agentId } = await request.json()

    if (agentId !== user.id) {
      return NextResponse.json({ error: 'Cannot assign to another agent' }, { status: 403 })
    }

    // Check if delivery exists and is unassigned
    const delivery = await prisma.delivery.findUnique({
      where: { id: params.id },
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

    if (delivery.agentId) {
      return NextResponse.json({ error: 'Delivery already assigned' }, { status: 400 })
    }

    // Update delivery with agent info
    const updatedDelivery = await prisma.delivery.update({
      where: { id: params.id },
      data: {
        agentId: user.id,
        agentName: user.name,
        agentPhone: user.phone,
        vehicleInfo: user.vehicleType ? `${user.vehicleType} - ${user.vehicleNumber}` : null,
        status: 'ASSIGNED'
      }
    })

    // Create notification for customer
    await prisma.notification.create({
      data: {
        receiverId: delivery.order.customer.id,
        type: 'EMAIL',
        title: 'Delivery Agent Assigned',
        message: `Your delivery has been assigned to ${user.name}. Tracking ID: ${delivery.trackingId}`,
        orderId: delivery.orderId
      }
    })

    return NextResponse.json({ delivery: updatedDelivery })
  } catch (error) {
    console.error('Delivery assignment error:', error)
    return NextResponse.json({ error: 'Failed to assign delivery' }, { status: 500 })
  }
}
