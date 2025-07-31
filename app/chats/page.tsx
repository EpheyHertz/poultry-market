'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Smile,
  MoreVertical,
  ArrowLeft,
  Phone,
  Video,
  Info
} from 'lucide-react';
import { useSocket } from '@/hooks/use-socket';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ChatSidebar from '@/components/chat/chat-sidebar';
import ChatWindow from '@/components/chat/chat-window';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Suspense } from 'react';
import type { Chat, Message } from '@/types/chat';

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = searchParams?.get('chat');
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const socket = useSocket();

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  // Fetch chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/chats');
        if (response.ok) {
          const chatsData = await response.json();
          setChats(chatsData);
          
          // Auto-select chat if chatId is provided
          if (chatId) {
            const selectedChatData = chatsData.find((chat: Chat) => chat.id === chatId);
            if (selectedChatData) {
              setSelectedChat(selectedChatData);
              fetchMessages(chatId);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
        toast.error('Failed to load chats');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchChats();
    }
  }, [user, chatId]);

  // Fetch messages for selected chat
  const fetchMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const messagesData = await response.json();
        setMessages(messagesData);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Handle chat selection
  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    setMessages([]);
    fetchMessages(chat.id);
    
    // Update URL
    const params = new URLSearchParams(searchParams?.toString());
    params.set('chat', chat.id);
    router.push(`?${params.toString()}`);
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket || !user) return;

    // Join user room
    socket.emit('join-user-room', user.id);

    // Listen for new messages
    socket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      
      // Update chat list with new last message
      setChats(prev => prev.map(chat => 
        chat.id === message.chatId 
          ? { 
              ...chat, 
              lastMessage: message.content, 
              lastMessageAt: message.createdAt,
              unreadCount: selectedChat?.id === chat.id ? 0 : chat.unreadCount + 1
            }
          : chat
      ));
    });

    // Listen for message updates (edit, delete, read)
    socket.on('message-updated', (updatedMessage: Message) => {
      setMessages(prev => prev.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      ));
    });

    // Listen for typing indicators
    socket.on('user-typing', ({ chatId, userId, isTyping }) => {
      // Handle typing indicator
    });

    return () => {
      socket.off('new-message');
      socket.off('message-updated');
      socket.off('user-typing');
    };
  }, [socket, user, selectedChat]);

  // Filter chats based on search
  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    
    const otherParticipant = chat.participant1.id === user?.id 
      ? chat.participant2 
      : chat.participant1;
    
    return otherParticipant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading || !user) {
    return (
      <DashboardLayout>
        <div className="flex h-[calc(100vh-80px)] bg-gray-50">
          <div className="w-full max-w-sm border-r bg-white p-4">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex space-x-3">
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading chats...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="flex h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
        {/* Chat Sidebar */}
        <div className={`${isMobile && selectedChat ? 'hidden' : ''} w-full max-w-sm border-r bg-white flex flex-col`}>
          <ChatSidebar
            chats={filteredChats}
            selectedChat={selectedChat}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onChatSelect={handleChatSelect}
            user={user}
          />
        </div>

        {/* Chat Window */}
        <div className={`${isMobile && !selectedChat ? 'hidden' : ''} flex-1 flex flex-col`}>
          {selectedChat ? (
            <ChatWindow
              chat={selectedChat}
              messages={messages}
              user={user}
              socket={socket}
              onBack={() => {
                setSelectedChat(null);
                const params = new URLSearchParams(searchParams?.toString());
                params.delete('chat');
                router.push(`?${params.toString()}`);
              }}
              onMessagesUpdate={setMessages}
              isMobile={isMobile}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No chat selected</h3>
                <p className="text-gray-500 max-w-md">
                  Choose a conversation from the sidebar to start chatting, or search for someone to message.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
