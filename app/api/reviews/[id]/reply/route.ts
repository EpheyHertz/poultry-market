import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  // { params }: { params: { id: string } }
) {
  try {
     const id = request.nextUrl.pathname.split('/').pop() || ''
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'SELLER' && user.role !== 'COMPANY' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { comment } = await request.json()
    const reviewId =id

    // Get the review with product info
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          include: {
            seller: true
          }
        }
      }
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Check if user can reply to this review
    const canReply = user.role === 'ADMIN' || review.product.sellerId === user.id

    if (!canReply) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if user already replied to this review
    const existingReply = await prisma.reviewReply.findFirst({
      where: {
        reviewId,
        userId: user.id
      }
    })

    if (existingReply) {
      return NextResponse.json({ 
        error: 'You have already replied to this review' 
      }, { status: 400 })
    }

    const reply = await prisma.reviewReply.create({
      data: {
        reviewId,
        userId: user.id,
        comment
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json(reply)
  } catch (error) {
    console.error('Review reply error:', error)
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 })
  }
}