import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/checkout/session/[sessionId] - Get specific checkout session
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = request.nextUrl.pathname.split('/').pop() || ''

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Get the checkout session
    const checkoutSession = await prisma.checkoutSession.findUnique({
      where: {
        id: sessionId,
        userId: user.id // Ensure user can only access their own sessions
      },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                role: true,
                dashboardSlug: true
              }
            }
          }
        }
      }
    })

    if (!checkoutSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if session has expired
    if (checkoutSession.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session has expired' }, { status: 410 })
    }

    // Check if session is already completed
    if (checkoutSession.isCompleted) {
      return NextResponse.json({ error: 'Session has already been completed' }, { status: 410 })
    }

    return NextResponse.json(checkoutSession)

  } catch (error) {
    console.error('Get checkout session error:', error)
    return NextResponse.json({ error: 'Failed to get checkout session' }, { status: 500 })
  }
}

// PATCH /api/checkout/session/[sessionId] - Update checkout session
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = request.nextUrl.pathname.split('/').pop() || ''
    const updates = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Verify session belongs to user and is still valid
    const existingSession = await prisma.checkoutSession.findUnique({
      where: {
        id: sessionId,
        userId: user.id
      }
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (existingSession.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session has expired' }, { status: 410 })
    }

    if (existingSession.isCompleted) {
      return NextResponse.json({ error: 'Session has already been completed' }, { status: 410 })
    }

    // Update the session
    const updatedSession = await prisma.checkoutSession.update({
      where: {
        id: sessionId
      },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                role: true,
                dashboardSlug: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedSession)

  } catch (error) {
    console.error('Update checkout session error:', error)
    return NextResponse.json({ error: 'Failed to update checkout session' }, { status: 500 })
  }
}

// DELETE /api/checkout/session/[sessionId] - Cancel checkout session
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = request.nextUrl.pathname.split('/').pop() || ''

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Verify session belongs to user
    const existingSession = await prisma.checkoutSession.findUnique({
      where: {
        id: sessionId,
        userId: user.id
      }
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (existingSession.isCompleted) {
      return NextResponse.json({ error: 'Cannot cancel completed session' }, { status: 400 })
    }

    // Delete the session
    await prisma.checkoutSession.delete({
      where: {
        id: sessionId
      }
    })

    return NextResponse.json({ message: 'Session cancelled successfully' })

  } catch (error) {
    console.error('Delete checkout session error:', error)
    return NextResponse.json({ error: 'Failed to cancel checkout session' }, { status: 500 })
  }
}
