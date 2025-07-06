
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get unread message count for user
    const unreadCount = await prisma.chatMessage.count({
      where: {
        chat: {
          OR: [
            { participant1Id: user.id },
            { participant2Id: user.id }
          ]
        },
        senderId: { not: user.id },
        isRead: false
      }
    })

    // Get recent unread messages with chat details
    const recentUnreadMessages = await prisma.chatMessage.findMany({
      where: {
        chat: {
          OR: [
            { participant1Id: user.id },
            { participant2Id: user.id }
          ]
        },
        senderId: { not: user.id },
        isRead: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        },
        chat: {
          select: {
            id: true,
            productId: true,
            orderId: true,
            product: {
              select: {
                name: true,
                images: true
              }
            },
            order: {
              select: {
                id: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    return NextResponse.json({
      unreadCount,
      recentMessages: recentUnreadMessages
    })
  } catch (error) {
    console.error('Chat notifications error:', error)
    return NextResponse.json({ error: 'Failed to fetch chat notifications' }, { status: 500 })
  }
}

// Mark messages as read
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { chatId } = await request.json()

    await prisma.chatMessage.updateMany({
      where: {
        chatId,
        senderId: { not: user.id },
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark messages read error:', error)
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 })
  }
}
