'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  Info, 
  Send, 
  Paperclip, 
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Reply,
  Edit3,
  Trash2,
  Download,
  Check,
  CheckCheck,
  MessageCircle,
  X
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import MessageItem from '@/components/chat/message-item';
import MessageInput from '@/components/chat/message-input';
import type { Chat, Message } from '@/types/chat';

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  user: any;
  socket: any;
  onBack: () => void;
  onMessagesUpdate: (messages: Message[]) => void;
  isMobile: boolean;
}

export default function ChatWindow({
  chat,
  messages,
  user,
  socket,
  onBack,
  onMessagesUpdate,
  isMobile
}: ChatWindowProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const otherParticipant = chat.participant1.id === user?.id ? chat.participant2 : chat.participant1;

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle new message
  const handleSendMessage = async (content: string, images: string[] = [], files: string[] = []) => {
    if (!content.trim() && images.length === 0 && files.length === 0) return;

    try {
      const messageData = {
        content: content.trim(),
        type: images.length > 0 ? 'image' : files.length > 0 ? 'file' : 'text',
        images,
        files,
        replyToId: replyingTo?.id || null
      };

      const response = await fetch(`/api/chats/${chat.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const newMessage = await response.json();
      
      // Emit to socket for real-time update
      if (socket) {
        socket.emit('send-message', {
          chatId: chat.id,
          message: newMessage,
          recipientId: otherParticipant.id
        });
      }

      // Clear reply state
      setReplyingTo(null);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Handle message edit
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/chats/${chat.id}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newContent })
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      const updatedMessage = await response.json();
      
      // Update messages list
      onMessagesUpdate(messages.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      ));

      // Emit to socket
      if (socket) {
        socket.emit('message-updated', {
          chatId: chat.id,
          message: updatedMessage,
          recipientId: otherParticipant.id
        });
      }

      setEditingMessage(null);
      toast.success('Message updated');

    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };

  // Handle message delete
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/chats/${chat.id}/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      const updatedMessage = await response.json();
      
      // Update messages list
      onMessagesUpdate(messages.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      ));

      // Emit to socket
      if (socket) {
        socket.emit('message-updated', {
          chatId: chat.id,
          message: updatedMessage,
          recipientId: otherParticipant.id
        });
      }

      toast.success('Message deleted');

    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Handle typing indicator
  const handleTyping = (typing: boolean) => {
    setIsTyping(typing);
    if (socket) {
      socket.emit('typing', {
        chatId: chat.id,
        userId: user.id,
        isTyping: typing,
        recipientId: otherParticipant.id
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'COMPANY':
        return 'bg-blue-100 text-blue-800';
      case 'SELLER':
        return 'bg-green-100 text-green-800';
      case 'DELIVERY_AGENT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} />
              <AvatarFallback>
                {otherParticipant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold">{otherParticipant.name}</h2>
                <Badge
                  variant="outline"
                  className={cn('text-xs px-1.5 py-0.5', getRoleColor(otherParticipant.role))}
                >
                  {otherParticipant.role}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                {isTyping ? 'Typing...' : 'Online'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Context indicators */}
        {(chat.product || chat.order) && (
          <div className="flex items-center space-x-2 mt-3 pt-3 border-t">
            {chat.product && (
              <div className="flex items-center space-x-2 bg-blue-50 p-2 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded overflow-hidden">
                  {chat.product.images[0] && (
                    <Image
                      src={chat.product.images[0]}
                      alt={chat.product.name}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  )}
                </div>
                <span className="text-sm text-blue-800">Product: {chat.product.name}</span>
              </div>
            )}
            {chat.order && (
              <div className="flex items-center space-x-2 bg-green-50 p-2 rounded-lg">
                <span className="text-sm text-green-800">Order: {chat.order.status}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No messages yet</h3>
              <p className="text-sm text-gray-500">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={message.sender.id === user?.id}
                showAvatar={
                  index === 0 || 
                  messages[index - 1].sender.id !== message.sender.id ||
                  new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000 // 5 minutes
                }
                onReply={setReplyingTo}
                onEdit={setEditingMessage}
                onDelete={handleDeleteMessage}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="border-t border-l-4 border-l-blue-500 bg-blue-50 p-3 mx-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">
                Replying to {replyingTo.sender.name}
              </p>
              <p className="text-sm text-blue-800 truncate">
                {replyingTo.content}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t bg-white p-4">
        <MessageInput
          onSend={handleSendMessage}
          onTyping={handleTyping}
          editingMessage={editingMessage}
          onEditCancel={() => setEditingMessage(null)}
          onEditSave={handleEditMessage}
        />
      </div>
    </div>
  );
}
