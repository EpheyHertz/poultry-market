
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; applicationId: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'COMPANY') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status, rejectionReason } = await request.json()

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const application = await prisma.sponsorshipApplication.findFirst({
      where: {
        id: params.applicationId,
        sponsorshipId: params.id,
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
      where: { id: params.applicationId },
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

    // If approved, create actual sponsorship relationship
    if (status === 'APPROVED') {
      await prisma.sponsorship.update({
        where: { id: params.id },
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
