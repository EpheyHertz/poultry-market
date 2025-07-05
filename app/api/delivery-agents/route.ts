import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const approved = searchParams.get('approved')
    const location = searchParams.get('location')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {
      role: 'DELIVERY_AGENT'
    }

    if (approved === 'true') {
      where.isApproved = true
      where.isActive = true
    } else if (approved === 'false') {
      where.isApproved = false
    }

    if (location) {
      where.coverageArea = {
        contains: location,
        mode: 'insensitive'
      }
    }

    const [agents, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          createdAt: true,
          deliveries: {
            select: {
              id: true,
              status: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      agents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Delivery agents fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch delivery agents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      name, 
      email, 
      phone, 
      agentId,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      coverageArea,
      avatar
    } = await request.json()

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Check if agent ID already exists
    if (agentId) {
      const existingAgent = await prisma.user.findUnique({
        where: { agentId }
      })

      if (existingAgent) {
        return NextResponse.json({ error: 'Agent ID already exists' }, { status: 400 })
      }
    }

    const agent = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: 'DELIVERY_AGENT',
        agentId,
        vehicleType,
        vehicleNumber,
        licenseNumber,
        coverageArea,
        avatar,
        isVerified: true, // Admin-created agents are pre-verified
        isApproved: false // Needs manual approval
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

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Delivery agent creation error:', error)
    return NextResponse.json({ error: 'Failed to create delivery agent' }, { status: 500 })
  }
}