
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
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
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { participant1Id: user.id },
          { participant2Id: user.id }
        ]
      },
      include: {
        participant1: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        },
        participant2: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            price: true
          }
        },
        order: {
          select: {
            id: true,
            status: true,
            total: true
          }
        },
        messages: {
          where: {
            senderId: { not: user.id },
            isRead: false
          },
          select: {
            id: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      },
      skip: offset,
      take: limit
    })

    const totalChats = await prisma.chat.count({
      where: {
        OR: [
          { participant1Id: user.id },
          { participant2Id: user.id }
        ]
      }
    })

    const chatsWithMetadata = chats.map(chat => ({
      id: chat.id,
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt,
      unreadCount: chat.messages.length,
      totalMessages: chat._count.messages,
      otherParticipant: chat.participant1Id === user.id ? chat.participant2 : chat.participant1,
      product: chat.product,
      order: chat.order,
      context: {
        type: chat.productId ? 'product' : chat.orderId ? 'order' : 'general',
        productId: chat.productId,
        orderId: chat.orderId
      }
    }))

    return NextResponse.json({
      success: true,
      data: {
        chats: chatsWithMetadata,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalChats / limit),
          totalItems: totalChats,
          hasNextPage: page * limit < totalChats,
          hasPreviousPage: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Mobile chats API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch chats',
      code: 'FETCH_ERROR'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    const { participantId, productId, orderId, initialMessage } = await request.json()

    if (!participantId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Participant ID is required',
        code: 'MISSING_PARTICIPANT'
      }, { status: 400 })
    }

    // Handle admin support
    let actualParticipantId = participantId
    if (participantId === 'admin-support') {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true }
      })
      
      if (!adminUser) {
        return NextResponse.json({ 
          success: false, 
          error: 'Admin not found',
          code: 'ADMIN_NOT_FOUND'
        }, { status: 404 })
      }
      
      actualParticipantId = adminUser.id
    }

    // Check if chat exists
    let whereClause: any = {
      OR: [
        { 
          participant1Id: user.id, 
          participant2Id: actualParticipantId 
        },
        { 
          participant1Id: actualParticipantId, 
          participant2Id: user.id 
        }
      ]
    }

    if (productId) whereClause.productId = productId
    if (orderId) whereClause.orderId = orderId

    let chat = await prisma.chat.findFirst({
      where: whereClause,
      include: {
        participant1: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        },
        participant2: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            price: true
          }
        },
        order: {
          select: {
            id: true,
            status: true,
            total: true
          }
        }
      }
    })

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          participant1Id: user.id,
          participant2Id: actualParticipantId,
          productId,
          orderId
        },
        include: {
          participant1: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true
            }
          },
          participant2: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              price: true
            }
          },
          order: {
            select: {
              id: true,
              status: true,
              total: true
            }
          }
        }
      })
    }

    // Send initial message if provided
    if (initialMessage) {
      await prisma.chatMessage.create({
        data: {
          chatId: chat.id,
          senderId: user.id,
          content: initialMessage,
          type: 'text'
        }
      })

      await prisma.chat.update({
        where: { id: chat.id },
        data: { 
          lastMessageAt: new Date(),
          lastMessage: initialMessage.substring(0, 100)
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        chat: {
          id: chat.id,
          otherParticipant: chat.participant1Id === user.id ? chat.participant2 : chat.participant1,
          product: chat.product,
          order: chat.order,
          context: {
            type: chat.productId ? 'product' : chat.orderId ? 'order' : 'general',
            productId: chat.productId,
            orderId: chat.orderId
          }
        }
      }
    })
  } catch (error) {
    console.error('Mobile chat creation error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create chat',
      code: 'CREATION_ERROR'
    }, { status: 500 })
  }
}
