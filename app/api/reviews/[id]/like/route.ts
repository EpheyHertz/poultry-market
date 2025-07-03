import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reviewId = params.id

    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Check if user already liked this review
    const existingLike = await prisma.reviewLike.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId: user.id
        }
      }
    })

    if (existingLike) {
      // Unlike - remove the like
      await prisma.reviewLike.delete({
        where: {
          reviewId_userId: {
            reviewId,
            userId: user.id
          }
        }
      })

      return NextResponse.json({ liked: false, message: 'Review unliked' })
    } else {
      // Like - add the like
      await prisma.reviewLike.create({
        data: {
          reviewId,
          userId: user.id
        }
      })

      return NextResponse.json({ liked: true, message: 'Review liked' })
    }
  } catch (error) {
    console.error('Review like error:', error)
    return NextResponse.json({ error: 'Failed to process like' }, { status: 500 })
  }
}