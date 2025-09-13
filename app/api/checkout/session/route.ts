import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/checkout/session - Get user's active sessions
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active checkout sessions for this user
    const checkoutSessions = await prisma.checkoutSession.findMany({
      where: {
        userId: user.id,
        isCompleted: false,
        expiresAt: {
          gt: new Date()
        }
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      sessions: checkoutSessions
    });

  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({ 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 });
  }
}
