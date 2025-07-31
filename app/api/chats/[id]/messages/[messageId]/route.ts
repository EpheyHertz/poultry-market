import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest
) {
  const pathSegments = request.nextUrl.pathname.split('/')
  const chatId = pathSegments[pathSegments.length - 3]
  const messageId = pathSegments[pathSegments.length - 1]

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await request.json()

    if (!content.trim()) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 })
    }

    // Verify user has access to this chat and owns the message
    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        chatId,
        senderId: user.id,
        isDeleted: false
      }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 })
    }

    // Update message
    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
        editedAt: new Date()
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
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest
) {
  const pathSegments = request.nextUrl.pathname.split('/')
  const chatId = pathSegments[pathSegments.length - 3]
  const messageId = pathSegments[pathSegments.length - 1]

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this chat and owns the message
    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        chatId,
        senderId: user.id,
        isDeleted: false
      }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 })
    }

    // Soft delete message
    const deletedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '', // Clear content for privacy
        images: [], // Clear attachments
        files: []
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

    // Update chat's last message if this was the last message
    const lastMessage = await prisma.chatMessage.findFirst({
      where: {
        chatId,
        isDeleted: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (lastMessage) {
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          lastMessage: lastMessage.content || (lastMessage.images.length > 0 ? '📷 Image' : '📎 File'),
          lastMessageAt: lastMessage.createdAt
        }
      })
    } else {
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          lastMessage: null,
          lastMessageAt: null
        }
      })
    }

    return NextResponse.json(deletedMessage)
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
