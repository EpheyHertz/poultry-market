
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ChatWidget from '@/components/chat/chat-widget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Package, ShoppingCart, User, Clock, Shield } from 'lucide-react';

interface Chat {
  id: string;
  productId?: string;
  orderId?: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  otherParticipant: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  product?: {
    id: string;
    name: string;
    images: string[];
  };
  order?: {
    id: string;
    status: string;
  };
}

export default function AdminChats() {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'ADMIN') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
          fetchChats();
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  const fetchChats = async () => {
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const chatsData = await response.json();
        setChats(chatsData);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CUSTOMER': return 'bg-green-100 text-green-800';
      case 'SELLER': return 'bg-blue-100 text-blue-800';
      case 'COMPANY': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChatIcon = (chat: Chat) => {
    if (chat.productId) return <Package className="h-4 w-4" />;
    if (chat.orderId) return <ShoppingCart className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
  };

  const getChatDescription = (chat: Chat) => {
    if (chat.product) return `Product: ${chat.product.name}`;
    if (chat.order) return `Order: ${chat.order.status}`;
    return 'Customer Support';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Shield className="mr-3 h-8 w-8" />
            Customer Support Chats
          </h1>
          <p className="text-gray-600 mt-2">Handle customer inquiries and provide support</p>
        </div>

        {/* Chats List */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : chats.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No support chats yet</h3>
              <p className="text-gray-600">Customer support conversations will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {chats.map((chat) => (
              <Card key={chat.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={chat.otherParticipant.avatar} />
                          <AvatarFallback>{chat.otherParticipant.name[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{chat.otherParticipant.name}</h3>
                          <Badge variant="secondary" className={getRoleColor(chat.otherParticipant.role)}>
                            {chat.otherParticipant.role}
                          </Badge>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {chat.unreadCount} new
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          {getChatIcon(chat)}
                          <span>{getChatDescription(chat)}</span>
                        </div>
                        
                        {chat.lastMessage && (
                          <p className="text-sm text-gray-600 truncate">
                            {chat.lastMessage}
                          </p>
                        )}
                        
                        {chat.lastMessageAt && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(chat.lastMessageAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 ml-4">
                      <ChatWidget
                        participantId={chat.otherParticipant.id}
                        participantName={chat.otherParticipant.name}
                        participantAvatar={chat.otherParticipant.avatar}
                        productId={chat.productId}
                        orderId={chat.orderId}
                        triggerButton={
                          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Open Chat
                          </button>
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
