
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest
) {
   const id = request.nextUrl.pathname.split('/').pop() || ''
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Verify user has access to this chat
    const chat = await prisma.chat.findFirst({
      where: {
        id: id,
        OR: [
          { participant1Id: user.id },
          { participant2Id: user.id }
        ]
      }
    })

    if (!chat) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chat not found or access denied',
        code: 'CHAT_NOT_FOUND'
      }, { status: 404 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatId: id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    })

    const totalMessages = await prisma.chatMessage.count({
      where: { chatId: id }
    })

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: {
        chatId: id,
        senderId: { not: user.id },
        isRead: false
      },
      data: { isRead: true }
    })

    return NextResponse.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to get chronological order
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMessages / limit),
          totalItems: totalMessages,
          hasNextPage: page * limit < totalMessages,
          hasPreviousPage: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Mobile chat messages API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch messages',
      code: 'FETCH_ERROR'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest
  
) {
   const id = request.nextUrl.pathname.split('/').pop() || ''
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    const { content, type = 'text', images = [] } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Message content is required',
        code: 'MISSING_CONTENT'
      }, { status: 400 })
    }

    // Verify user has access to this chat
    const chat = await prisma.chat.findFirst({
      where: {
        id: id,
        OR: [
          { participant1Id: user.id },
          { participant2Id: user.id }
        ]
      }
    })

    if (!chat) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chat not found or access denied',
        code: 'CHAT_NOT_FOUND'
      }, { status: 404 })
    }

    const message = await prisma.chatMessage.create({
      data: {
        chatId: id,
        senderId: user.id,
        content: content.trim(),
        type,
        images
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        }
      }
    })

    // Update chat last activity
    await prisma.chat.update({
      where: { id: id },
      data: { 
        lastMessageAt: new Date(),
        lastMessage: content.substring(0, 100)
      }
    })

    return NextResponse.json({
      success: true,
      data: { message }
    })
  } catch (error) {
    console.error('Mobile send message API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send message',
      code: 'SEND_ERROR'
    }, { status: 500 })
  }
}
