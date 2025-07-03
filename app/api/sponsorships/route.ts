import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { SponsorshipStatus } from '@prisma/client'

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
    
    if (user.role === 'COMPANY') {
      where.companyId = user.id
    } else if (user.role === 'SELLER') {
      where.sellerId = user.id
    } else if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    if (status) {
      where.status = status as SponsorshipStatus
    }

    const [sponsorships, total] = await Promise.all([
      prisma.sponsorship.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sponsorship.count({ where })
    ])

    return NextResponse.json({
      sponsorships,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Sponsorships fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch sponsorships' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { companyId, sellerId, amount, description, terms, duration, benefits } = await request.json()

    let sponsorshipData: any = {
      amount: parseFloat(amount),
      description,
      terms,
      duration: duration ? parseInt(duration) : null,
      benefits: benefits || []
    }

    if (user.role === 'COMPANY') {
      sponsorshipData.companyId = user.id
      sponsorshipData.sellerId = sellerId
    } else if (user.role === 'SELLER') {
      sponsorshipData.companyId = companyId
      sponsorshipData.sellerId = user.id
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sponsorship = await prisma.sponsorship.create({
      data: sponsorshipData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(sponsorship)
  } catch (error) {
    console.error('Sponsorship creation error:', error)
    return NextResponse.json({ error: 'Failed to create sponsorship' }, { status: 500 })
  }
}