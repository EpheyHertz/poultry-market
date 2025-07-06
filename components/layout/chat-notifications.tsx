
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, User, Package, ShoppingCart } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ChatWidget from '@/components/chat/chat-widget'

interface ChatNotification {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    name: string
    avatar?: string
    role: string
  }
  chat: {
    id: string
    productId?: string
    orderId?: string
    product?: {
      name: string
      images: string[]
    }
    order?: {
      id: string
      status: string
    }
  }
}

export default function ChatNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentMessages, setRecentMessages] = useState<ChatNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchChatNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchChatNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchChatNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/chats')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount)
        setRecentMessages(data.recentMessages)
      }
    } catch (error) {
      console.error('Failed to fetch chat notifications:', error)
    }
  }

  const markAsRead = async (chatId: string) => {
    try {
      await fetch('/api/notifications/chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      })
      fetchChatNotifications()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const getChatIcon = (message: ChatNotification) => {
    if (message.chat.productId) return <Package className="h-4 w-4" />
    if (message.chat.orderId) return <ShoppingCart className="h-4 w-4" />
    return <User className="h-4 w-4" />
  }

  const getChatDescription = (message: ChatNotification) => {
    if (message.chat.product) return `Product: ${message.chat.product.name}`
    if (message.chat.order) return `Order: ${message.chat.order.status}`
    return 'General conversation'
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CUSTOMER': return 'bg-green-100 text-green-800'
      case 'SELLER': return 'bg-blue-100 text-blue-800'
      case 'COMPANY': return 'bg-purple-100 text-purple-800'
      case 'ADMIN': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <MessageCircle className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Recent Messages</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {recentMessages.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No new messages
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {recentMessages.map((message) => (
              <DropdownMenuItem 
                key={message.id} 
                className="p-3 cursor-pointer"
                onClick={() => markAsRead(message.chat.id)}
              >
                <div className="flex items-start space-x-3 w-full">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.sender.avatar} />
                    <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {message.sender.name}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getRoleColor(message.sender.role)}`}
                      >
                        {message.sender.role}
                      </Badge>
                      {getChatIcon(message)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1 line-clamp-2">
                      {message.content}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {getChatDescription(message)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
