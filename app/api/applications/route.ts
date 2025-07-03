import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { UserRole, ApplicationStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (user.role === 'ADMIN') {
      // Admin can see all applications
      if (status) {
        where.status = status as ApplicationStatus
      }
    } else {
      // Users can only see their own applications
      where.userId = user.id
      if (status) {
        where.status = status as ApplicationStatus
      }
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.application.count({ where })
    ])

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Applications fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestedRole, businessName, businessType, description, documents } = await request.json()

    // Check if user already has a pending application for this role
    const existingApplication = await prisma.application.findFirst({
      where: {
        userId: user.id,
        requestedRole: requestedRole as UserRole,
        status: 'PENDING'
      }
    })

    if (existingApplication) {
      return NextResponse.json({ 
        error: 'You already have a pending application for this role' 
      }, { status: 400 })
    }

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        requestedRole: requestedRole as UserRole,
        businessName,
        businessType,
        description,
        documents: documents || []
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(application)
  } catch (error) {
    console.error('Application creation error:', error)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }
}