
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest
) {
  const id = request.nextUrl.pathname.split('/').slice(-2, -1)[0] || ''
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this chat
    const chat = await prisma.chat.findFirst({
      where: {
        id,
        OR: [
          { participant1Id: user.id },
          { participant2Id: user.id }
        ]
      }
    })

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { 
        chatId: id,
        isDeleted: false
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
      },
      orderBy: { createdAt: 'asc' }
    })

    // Mark messages as read and delivered
    await prisma.chatMessage.updateMany({
      where: {
        chatId: id,
        senderId: { not: user.id },
        isRead: false
      },
      data: { 
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest
) {
  const id = request.nextUrl.pathname.split('/').slice(-2, -1)[0] || ''
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, type = 'text', images = [], files = [], replyToId } = await request.json()

    if (!content.trim() && images.length === 0 && files.length === 0) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 })
    }

    // Verify user has access to this chat
    const chat = await prisma.chat.findFirst({
      where: {
        id,
        OR: [
          { participant1Id: user.id },
          { participant2Id: user.id }
        ]
      }
    })

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Verify replyTo message exists if provided
    if (replyToId) {
      const replyToMessage = await prisma.chatMessage.findFirst({
        where: {
          id: replyToId,
          chatId: id
        }
      })

      if (!replyToMessage) {
        return NextResponse.json({ error: 'Reply message not found' }, { status: 404 })
      }
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        chatId: id,
        senderId: user.id,
        content: content.trim(),
        type,
        images,
        files,
        replyToId,
        deliveredAt: new Date()
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

    // Update chat with last message
    await prisma.chat.update({
      where: { id },
      data: {
        lastMessage: content.trim() || (images.length > 0 ? '📷 Image' : '📎 File'),
        lastMessageAt: new Date()
      }
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const user = await getCurrentUser()
//     if (!user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const { searchParams } = new URL(request.url)
//     const page = parseInt(searchParams.get('page') || '1')
//     const limit = parseInt(searchParams.get('limit') || '50')
//     const skip = (page - 1) * limit

//     // Verify user is participant in chat
//     const chat = await prisma.chat.findFirst({
//       where: {
//         id: params.id,
//         OR: [
//           { participant1Id: user.id },
//           { participant2Id: user.id }
//         ]
//       }
//     })

//     if (!chat) {
//       return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
//     }

//     const messages = await prisma.chatMessage.findMany({
//       where: { chatId: params.id },
//       include: {
//         sender: {
//           select: {
//             id: true,
//             name: true,
//             avatar: true
//           }
//         }
//       },
//       orderBy: {
//         createdAt: 'desc'
//       },
//       skip,
//       take: limit
//     })

//     // Mark messages as read
//     await prisma.chatMessage.updateMany({
//       where: {
//         chatId: params.id,
//         senderId: { not: user.id },
//         isRead: false
//       },
//       data: { isRead: true }
//     })

//     return NextResponse.json(messages.reverse())
//   } catch (error) {
//     return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
//   }
// }
