import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest
) {
   const id = request.nextUrl.pathname.split('/').pop() || ''
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

    return NextResponse.json(updatedAgent)
  } catch (error) {
    console.error('Agent approval error:', error)
    return NextResponse.json({ error: 'Failed to update agent status' }, { status: 500 })
  }
}