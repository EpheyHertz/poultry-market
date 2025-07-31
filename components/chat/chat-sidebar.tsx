'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, Plus, Settings, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Chat } from '@/types/chat';

interface ChatSidebarProps {
  chats: Chat[];
  selectedChat: Chat | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onChatSelect: (chat: Chat) => void;
  user: any;
}

export default function ChatSidebar({
  chats,
  selectedChat,
  searchQuery,
  onSearchChange,
  onChatSelect,
  user
}: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');

  const getOtherParticipant = (chat: Chat) => {
    return chat.participant1.id === user?.id ? chat.participant2 : chat.participant1;
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

  const filteredChats = chats.filter(chat => {
    if (activeTab === 'unread' && chat.unreadCount === 0) return false;
    if (activeTab === 'archived') return false; // Implement archived logic
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Chats</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors relative',
              activeTab === 'unread'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Unread
            {chats.filter(c => c.unreadCount > 0).length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {chats.filter(c => c.unreadCount > 0).length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
              activeTab === 'archived'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Archive className="h-4 w-4 mx-auto" />
          </button>
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No chats found</h3>
              <p className="text-sm text-gray-500">
                {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const otherParticipant = getOtherParticipant(chat);
              const isSelected = selectedChat?.id === chat.id;

              return (
                <div
                  key={chat.id}
                  onClick={() => onChatSelect(chat)}
                  className={cn(
                    'p-4 cursor-pointer hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-blue-50 border-r-2 border-blue-500'
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} />
                        <AvatarFallback>
                          {otherParticipant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {otherParticipant.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn('text-xs px-1.5 py-0.5', getRoleColor(otherParticipant.role))}
                          >
                            {otherParticipant.role}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {chat.lastMessageAt && (
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })}
                            </span>
                          )}
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 truncate mb-1">
                        {chat.lastMessage || 'No messages yet'}
                      </p>

                      {/* Context indicators */}
                      <div className="flex items-center space-x-2">
                        {chat.product && (
                          <Badge variant="outline" className="text-xs">
                            Product: {chat.product.name}
                          </Badge>
                        )}
                        {chat.order && (
                          <Badge variant="outline" className="text-xs">
                            Order: {chat.order.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
