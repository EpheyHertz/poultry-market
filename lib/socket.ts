
import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO, Socket } from 'socket.io'
import { prisma } from './prisma'
import { verifyToken } from './auth'

// Extend NetServer type to include 'io'
declare module 'http' {
  interface Server {
    io?: ServerIO
  }
}

// Extend Socket type to include userId and userRole
declare module 'socket.io' {
  interface Socket {
    userId?: string
    userRole?: string
  }
}

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: ServerIO
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export function initSocket(server: NetServer) {
  if (!server.io) {
    const io = new ServerIO(server, {
      path: '/api/socket',
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL 
          : 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    })

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) {
          return next(new Error('Authentication error'))
        }
        
        const payload = await verifyToken(token)
        const user = await prisma.user.findUnique({
          where: { id: payload.userId }
        })
        
        if (!user) {
          return next(new Error('User not found'))
        }
        
        socket.userId = user.id
        socket.userRole = user.role
        next()
      } catch (err) {
        next(new Error('Authentication error'))
      }
    })

    io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`)

      socket.on('join-chat', (chatId: string) => {
        socket.join(`chat-${chatId}`)
      })

      socket.on('send-message', async (data) => {
        try {
          const { chatId, content, type = 'text', images = [] } = data
          
          if (!socket.userId) {
            socket.emit('error', { message: 'User not authenticated' })
            return
          }

          const message = await prisma.chatMessage.create({
            data: {
              chatId,
              senderId: socket.userId,
              content,
              type,
              images
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            }
          })

          // Update chat last activity
          await prisma.chat.update({
            where: { id: chatId },
            data: { 
              lastMessageAt: new Date(),
              lastMessage: content.substring(0, 100)
            }
          })

          io.to(`chat-${chatId}`).emit('new-message', message)
        } catch (error) {
          socket.emit('error', { message: 'Failed to send message' })
        }
      })

      socket.on('mark-read', async (chatId: string) => {
        try {
          await prisma.chatMessage.updateMany({
            where: {
              chatId,
              senderId: { not: socket.userId },
              isRead: false
            },
            data: { isRead: true }
          })

          socket.to(`chat-${chatId}`).emit('messages-read', chatId)
        } catch (error) {
          console.error('Error marking messages as read:', error)
        }
      })

      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`)
      })
    })

    server.io = io
  }
  return server.io
}
