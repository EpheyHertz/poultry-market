import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { ApplicationStatus, UserRole } from '@prisma/client'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status, reviewNotes } = await request.json()

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const updatedApplication = await prisma.application.update({
      where: { id: params.id },
      data: {
        status: status as ApplicationStatus,
        reviewNotes,
        reviewedAt: new Date(),
        reviewedBy: user.id
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

    // If approved, update user role
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: application.userId },
        data: { role: application.requestedRole }
      })

      // Create notification
      const template = notificationTemplates.applicationApproved(application.requestedRole.toLowerCase())
      await createNotification({
        receiverId: application.userId,
        senderId: user.id,
        type: 'EMAIL',
        title: template.title,
        message: template.message
      })
    } else if (status === 'REJECTED') {
      const template = notificationTemplates.applicationRejected(application.requestedRole.toLowerCase())
      await createNotification({
        receiverId: application.userId,
        senderId: user.id,
        type: 'EMAIL',
        title: template.title,
        message: template.message
      })
    }

    return NextResponse.json(updatedApplication)
  } catch (error) {
    console.error('Application update error:', error)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}