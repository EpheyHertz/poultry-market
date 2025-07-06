'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MessageCircle, Send, Image as ImageIcon, X } from 'lucide-react'
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
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Fetch user data
  useEffect(() => {
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
    fetchUser()
  }, [])

  // Initialize socket and chat when dialog opens
  useEffect(() => {
    if (isOpen && !socket && user) {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
        path: '/api/socket',
        withCredentials: true,
        auth: { token: localStorage.getItem('token') }
      })

      newSocket.on('connect', () => {
        console.log('Connected to chat server')
        createOrJoinChat(newSocket)
      })

      newSocket.on('disconnect', () => {
        console.log('Disconnected from chat server')
      })

      newSocket.on('error', (error) => {
        console.error('Socket error:', error)
        toast.error('Connection error. Please refresh.')
      })

      newSocket.on('new-message', (message: Message) => {
        setMessages(prev => [...prev, message])
        markMessagesAsRead()
      })

      newSocket.on('messages-read', () => {
        setMessages(prev => prev.map(msg => ({ ...msg, isRead: true })))
      })

      newSocket.on('chat-history', (history: Message[]) => {
        setMessages(history)
      })

      setSocket(newSocket)
    }

    return () => {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
    }
  }, [isOpen, user])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [])

  const createOrJoinChat = async (socket: Socket) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          participantId,
          productId,
          orderId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to initialize chat')
      }

      const chat = await response.json()
      setChatId(chat.id)
      socket.emit('join-chat', chat.id)
    } catch (error) {
      console.error('Chat initialization error:', error)
      toast.error('Failed to start chat')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket || !chatId) return

    const messageToSend = {
      chatId,
      content: newMessage.trim(),
      type: 'text',
      images: []
    }

    try {
      // Optimistically add the message to UI
      const tempId = Date.now().toString()
      setMessages(prev => [
        ...prev,
        {
          id: tempId,
          content: messageToSend.content,
          type: messageToSend.type,
          images: messageToSend.images,
          isRead: false,
          createdAt: new Date().toISOString(),
          sender: {
            id: user.id,
            name: user.name,
            avatar: user.avatar
          }
        }
      ])

      // Send via socket
      socket.emit('send-message', messageToSend)
      setNewMessage('')
      scrollToBottom()
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
      // Remove the optimistic message if failed
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
    }
  }

  const markMessagesAsRead = useCallback(() => {
    if (socket && chatId) {
      socket.emit('mark-read', chatId)
    }
  }, [socket, chatId])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
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
              <AvatarFallback>{participantName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate">{participantName}</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <p>Loading chat...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender.id !== user.id && (
                    <Avatar className="h-6 w-6 mr-2 mt-1">
                      <AvatarImage src={message.sender.avatar} />
                      <AvatarFallback>{message.sender.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender.id === user.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className="flex justify-end mt-1">
                      <span className="text-xs opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={handleKeyPress}
              disabled={!socket || !chatId}
            />
            <Button 
              size="sm" 
              onClick={sendMessage}
              disabled={!newMessage.trim() || !socket || !chatId}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}