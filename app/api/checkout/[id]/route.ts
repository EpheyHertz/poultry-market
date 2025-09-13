import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/checkout/[id] - Get specific checkout by ID
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.pathname.split('/').pop() || ''

    if (!id) {
      return NextResponse.json({ error: 'Checkout ID required' }, { status: 400 })
    }

    // Get the checkout session by ID
    const checkout = await prisma.checkoutSession.findUnique({
      where: {
        id: id,
        userId: user.id // Ensure user can only access their own checkouts
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

    if (!checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }

    return NextResponse.json(checkout)

  } catch (error) {
    console.error('Get checkout error:', error)
    return NextResponse.json({ error: 'Failed to get checkout' }, { status: 500 })
  }
}

// PATCH /api/checkout/[id] - Update checkout
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.pathname.split('/').pop() || ''
    const updates = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Checkout ID required' }, { status: 400 })
    }

    // Verify checkout belongs to user and is still valid
    const existingCheckout = await prisma.checkoutSession.findUnique({
      where: {
        id: id,
        userId: user.id
      }
    })

    if (!existingCheckout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }

    if (existingCheckout.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Checkout has expired' }, { status: 410 })
    }

    if (existingCheckout.isCompleted) {
      return NextResponse.json({ error: 'Checkout has already been completed' }, { status: 410 })
    }

    // Update the checkout
    const updatedCheckout = await prisma.checkoutSession.update({
      where: {
        id: id
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

    return NextResponse.json(updatedCheckout)

  } catch (error) {
    console.error('Update checkout error:', error)
    return NextResponse.json({ error: 'Failed to update checkout' }, { status: 500 })
  }
}

// DELETE /api/checkout/[id] - Cancel checkout
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.pathname.split('/').pop() || ''

    if (!id) {
      return NextResponse.json({ error: 'Checkout ID required' }, { status: 400 })
    }

    // Verify checkout belongs to user
    const existingCheckout = await prisma.checkoutSession.findUnique({
      where: {
        id: id,
        userId: user.id
      }
    })

    if (!existingCheckout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }

    if (existingCheckout.isCompleted) {
      return NextResponse.json({ error: 'Cannot cancel completed checkout' }, { status: 400 })
    }

    // Delete the checkout
    await prisma.checkoutSession.delete({
      where: {
        id: id
      }
    })

    return NextResponse.json({ message: 'Checkout cancelled successfully' })

  } catch (error) {
    console.error('Delete checkout error:', error)
    return NextResponse.json({ error: 'Failed to cancel checkout' }, { status: 500 })
  }
}
