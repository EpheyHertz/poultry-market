import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'COMPANY') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status, rejectionReason } = await request.json()

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Extract path parameters from URL
    const segments = request.nextUrl.pathname.split('/')
    const applicationId = segments.pop() || ''
    const sponsorshipId = segments.pop() || ''

    const application = await prisma.sponsorshipApplication.findFirst({
      where: {
        id: applicationId,
        sponsorshipId: sponsorshipId,
        sponsorship: {
          companyId: user.id
        }
      },
      include: {
        sponsorship: true,
        seller: true
      }
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const updatedApplication = await prisma.sponsorshipApplication.update({
      where: { id: applicationId },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        reviewedAt: new Date()
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

    // If approved, activate the sponsorship
    if (status === 'APPROVED') {
      await prisma.sponsorship.update({
        where: { id: sponsorshipId },
        data: {
          sellerId: application.sellerId,
          status: 'ACTIVE',
          startDate: new Date()
        }
      })
    }

    return NextResponse.json(updatedApplication)
  } catch (error) {
    console.error('Sponsorship application update error:', error)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}
