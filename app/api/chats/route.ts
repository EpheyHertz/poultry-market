
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
            images: true
          }
        },
        order: {
          select: {
            id: true,
            status: true
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
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      }
    })

    const chatsWithUnreadCount = chats.map(chat => ({
      ...chat,
      unreadCount: chat.messages.length,
      otherParticipant: chat.participant1Id === user.id ? chat.participant2 : chat.participant1
    }))

    return NextResponse.json(chatsWithUnreadCount)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { participantId, productId, orderId } = await request.json()

    // Handle admin support chat
    if (participantId === 'admin-support') {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true }
      })
      
      if (!adminUser) {
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
      }
      
      const actualParticipantId = adminUser.id
      
      let chat = await prisma.chat.findFirst({
        where: {
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
          }
        }
      })

      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            participant1Id: user.id,
            participant2Id: actualParticipantId
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
            }
          }
        })
      }

      return NextResponse.json(chat)
    }

    // Check if chat already exists
    let whereClause: any = {
      OR: [
        { 
          participant1Id: user.id, 
          participant2Id: participantId 
        },
        { 
          participant1Id: participantId, 
          participant2Id: user.id 
        }
      ]
    }

    if (productId) {
      whereClause.productId = productId
    }
    if (orderId) {
      whereClause.orderId = orderId
    }

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
            images: true
          }
        }
      }
    })

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          participant1Id: user.id,
          participant2Id: participantId,
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
              images: true
            }
          }
        }
      })
    }

    return NextResponse.json(chat)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
  }
}
