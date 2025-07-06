
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

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
      orderBy: { createdAt: 'asc' }
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

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
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
