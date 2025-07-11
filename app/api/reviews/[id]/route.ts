import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(
  request: NextRequest
  // { params }: { params: { id: string } }
) {
   const id = request.nextUrl.pathname.split('/').pop() || ''
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reviewId =id

    // Get the review
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

    // Check permissions - admin can delete any review, users can delete their own
    const canDelete = user.role === 'ADMIN' || review.userId === user.id

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the review (this will cascade delete likes and replies)
    await prisma.review.delete({
      where: { id: reviewId }
    })

    return NextResponse.json({ message: 'Review deleted successfully' })
  } catch (error) {
    console.error('Review deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }
}

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

    const { isVisible } = await request.json()
    const reviewId = id

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { isVisible },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        likes: true,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(review)
  } catch (error) {
    console.error('Review update error:', error)
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }
}