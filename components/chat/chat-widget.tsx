
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MessageCircle, Send, Image, X } from 'lucide-react'
import { toast } from 'sonner'
import { io, Socket } from 'socket.io-client'

interface ChatWidgetProps {
  participantId: string
  participantName: string
  participantAvatar?: string
  productId?: string
  orderId?: string
  triggerButton?: React.ReactNode
}

interface Message {
  id: string
  content: string
  type: string
  images: string[]
  isRead: boolean
  createdAt: string
  sender: {
    id: string
    name: string
    avatar?: string
  }
}

export default function ChatWidget({
  participantId,
  participantName,
  participantAvatar,
  productId,
  orderId,
  triggerButton
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [user, setUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (isOpen && !socket && user) {
      initializeSocket()
    }
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [isOpen, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  const initializeSocket = () => {
    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      path: '/api/socket',
      auth: { token: 'temp-token' }
    })

    newSocket.on('connect', () => {
      console.log('Connected to chat')
      createOrJoinChat()
    })

    newSocket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    newSocket.on('messages-read', () => {
      setMessages(prev => prev.map(msg => ({ ...msg, isRead: true })))
    })

    setSocket(newSocket)
  }

  const createOrJoinChat = async () => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          productId,
          orderId
        })
      })

      if (response.ok) {
        const chat = await response.json()
        setChatId(chat.id)
        socket?.emit('join-chat', chat.id)
        await fetchMessages(chat.id)
      }
    } catch (error) {
      toast.error('Failed to initialize chat')
    }
  }

  const fetchMessages = async (chatIdToFetch: string) => {
    try {
      const response = await fetch(`/api/chats/${chatIdToFetch}/messages`)
      if (response.ok) {
        const messages = await response.json()
        setMessages(messages)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !chatId) return

    socket.emit('send-message', {
      chatId,
      content: newMessage,
      type: 'text'
    })

    setNewMessage('')
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={participantAvatar} />
              <AvatarFallback>{participantName[0]}</AvatarFallback>
            </Avatar>
            {participantName}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender.id === user.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <span className="text-xs opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button size="sm" onClick={sendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
