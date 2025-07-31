import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest
) {
  const pathSegments = request.nextUrl.pathname.split('/');
  const chatId = pathSegments[pathSegments.length - 3];
  const messageId = pathSegments[pathSegments.length - 2];

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji required' }, { status: 400 });
    }

    // Verify user has access to this chat
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        OR: [
          { participant1Id: user.id },
          { participant2Id: user.id }
        ]
      }
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    // Check if message exists
    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        chatId,
        isDeleted: false
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user already reacted with this emoji
    const existingReaction = await prisma.messageReaction.findFirst({
      where: {
        messageId,
        userId: user.id,
        emoji
      }
    });

    if (existingReaction) {
      return NextResponse.json({ error: 'Already reacted with this emoji' }, { status: 400 });
    }

    // Add reaction
    await prisma.messageReaction.create({
      data: {
        messageId,
        userId: user.id,
        emoji
      }
    });

    // Get updated message with reactions
    const updatedMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId },
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
                name: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        files: true
      }
    });

    // Format reactions for response
    const formattedMessage = {
      ...updatedMessage,
      reactions: formatReactions(updatedMessage?.reactions || [])
    };

    return NextResponse.json(formattedMessage);

  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  const pathSegments = request.nextUrl.pathname.split('/');
  const chatId = pathSegments[pathSegments.length - 3];
  const messageId = pathSegments[pathSegments.length - 2];

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji required' }, { status: 400 });
    }

    // Verify user has access to this chat
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        OR: [
          { participant1Id: user.id },
          { participant2Id: user.id }
        ]
      }
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    // Remove reaction
    await prisma.messageReaction.deleteMany({
      where: {
        messageId,
        userId: user.id,
        emoji
      }
    });

    // Get updated message with reactions
    const updatedMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId },
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
                name: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        files: true
      }
    });

    // Format reactions for response
    const formattedMessage = {
      ...updatedMessage,
      reactions: formatReactions(updatedMessage?.reactions || [])
    };

    return NextResponse.json(formattedMessage);

  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}

// Helper function to format reactions
function formatReactions(reactions: any[]) {
  const reactionMap = new Map();

  reactions.forEach(reaction => {
    const emoji = reaction.emoji;
    if (reactionMap.has(emoji)) {
      const existing = reactionMap.get(emoji);
      existing.count += 1;
      existing.users.push(reaction.user.id);
    } else {
      reactionMap.set(emoji, {
        emoji,
        count: 1,
        users: [reaction.user.id]
      });
    }
  });

  return Array.from(reactionMap.values());
}
