
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest
  // { params }: { params: { id: string } }
) {
  try {
    
    const user = await getCurrentUser()
     const id = request.nextUrl.pathname.split('/').pop() || ''
    if (!user || user.role !== 'COMPANY') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sponsorship = await prisma.sponsorship.findFirst({
      where: {
        id: id,
        companyId: user.id
      }
    })

    if (!sponsorship) {
      return NextResponse.json({ error: 'Sponsorship not found' }, { status: 404 })
    }

    const applications = await prisma.sponsorshipApplication.findMany({
      where: {
        sponsorshipId: id
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            dashboardSlug: true,
            tags: {
              select: {
                tag: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ applications })
  } catch (error) {
    console.error('Sponsorship applications fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest
  // { params }: { params: { id: string } }
) {
  try {
     const id = request.nextUrl.pathname.split('/').pop() || ''
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'SELLER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, businessDetails } = await request.json()

    const sponsorship = await prisma.sponsorship.findUnique({
      where: { id: id }
    })

    if (!sponsorship) {
      return NextResponse.json({ error: 'Sponsorship not found' }, { status: 404 })
    }

    // Check if seller already applied
    const existingApplication = await prisma.sponsorshipApplication.findFirst({
      where: {
        sponsorshipId: id,
        sellerId: user.id
      }
    })

    if (existingApplication) {
      return NextResponse.json({ error: 'Already applied to this sponsorship' }, { status: 400 })
    }

    const application = await prisma.sponsorshipApplication.create({
      data: {
        sponsorshipId: id,
        sellerId: user.id,
        message,
        businessDetails,
        status: 'PENDING'
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        sponsorship: {
          include: {
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(application)
  } catch (error) {
    console.error('Sponsorship application creation error:', error)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }
}
