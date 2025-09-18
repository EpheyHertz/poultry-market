import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export async function PUT(
  request: NextRequest
) {
  const pathParts = request.nextUrl.pathname.split('/')
  const id = pathParts[pathParts.length - 2] || '' // Get the ID (second to last part)
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { approved } = await request.json()

    const agent = await prisma.user.findUnique({
      where: { 
        id: id,
        role: 'DELIVERY_AGENT'
      }
    })

    if (!agent) {
      return NextResponse.json({ error: 'Delivery agent not found' }, { status: 404 })
    }

    const updatedAgent = await prisma.user.update({
      where: { id: id },
      data: { 
        isApproved: approved,
        isActive: approved // Approved agents are automatically active
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        agentId: true,
        vehicleType: true,
        vehicleNumber: true,
        licenseNumber: true,
        coverageArea: true,
        isApproved: true,
        isActive: true,
        createdAt: true
      }
    })
      await createNotification({
        receiverId: updatedAgent.id,
        senderId: user.id,
        type: 'EMAIL',
        title: "Delivery Account Approval Successful!",
        message:`Hello ${updatedAgent.name}, your Delivery Agent account for PoultryMarket has been successfully approved. Login to ypur account to start getting Deliveries.`
      })
    return NextResponse.json(updatedAgent)
  } catch (error) {
    console.error('Agent approval error:', error)
    return NextResponse.json({ error: 'Failed to update agent status' }, { status: 500 })
  }
}