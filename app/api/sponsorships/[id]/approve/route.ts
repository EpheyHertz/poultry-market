
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createNotification, notificationTemplates } from '@/lib/notifications'

export async function PUT(
  request: NextRequest
  // { params }: { params: { id: string } }
) {
  try {
     const id = request.nextUrl.pathname.split('/').pop() || ''
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()
    
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const sponsorship = await prisma.sponsorship.findUnique({
      where: { id: id },
      include: {
        company: true,
        seller: true
      }
    })

    if (!sponsorship) {
      return NextResponse.json({ error: 'Sponsorship not found' }, { status: 404 })
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
    const updateData: any = { status: newStatus }

    if (action === 'APPROVE') {
      updateData.startDate = new Date()
      if (sponsorship.duration) {
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + sponsorship.duration)
        updateData.endDate = endDate
      }
    }

    const updatedSponsorship = await prisma.sponsorship.update({
      where: { id: id },
      data: updateData,
      include: {
        company: true,
        seller: true
      }
    })

    // Notify company
    const companyTemplate = action === 'APPROVE' 
      ? notificationTemplates.sponsorshipApproved(sponsorship.seller.name)
      : notificationTemplates.sponsorshipRejected(sponsorship.seller.name)
    
    await createNotification({
      receiverId: sponsorship.companyId,
      senderId: user.id,
      type: 'EMAIL',
      title: companyTemplate.title,
      message: companyTemplate.message
    })

    // Notify seller
    const sellerTemplate = action === 'APPROVE'
      ? notificationTemplates.sponsorshipReceived(sponsorship.company.name)
      : notificationTemplates.sponsorshipDeclined(sponsorship.company.name)
    
    await createNotification({
      receiverId: sponsorship.sellerId,
      senderId: user.id,
      type: 'EMAIL',
      title: sellerTemplate.title,
      message: sellerTemplate.message
    })

    return NextResponse.json(updatedSponsorship)
  } catch (error) {
    console.error('Sponsorship approval error:', error)
    return NextResponse.json({ error: 'Failed to process sponsorship' }, { status: 500 })
  }
}
