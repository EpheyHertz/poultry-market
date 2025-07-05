'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ChatWidget from '@/components/chat/chat-widget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Package, ShoppingCart, User } from 'lucide-react';

interface Chat {
  id: string;
  productId?: string;
  orderId?: string;
  lastMessageAt: string;
  unreadCount: number;
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

export default function CustomerChats() {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'CUSTOMER') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

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
      case 'SELLER': return 'bg-blue-100 text-blue-800';
      case 'COMPANY': return 'bg-purple-100 text-purple-800';
      case 'ADMIN': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
            <MessageCircle className="mr-3 h-8 w-8" />
            My Chats
          </h1>
          <p className="text-gray-600 mt-2">Communicate with sellers, companies, and support</p>
        </div>

        {/* Customer Care Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <MessageCircle className="mr-2 h-5 w-5" />
              Customer Care
            </CardTitle>
            <CardDescription className="text-blue-700">
              Need help? Chat with our support team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 bg-blue-100">
                  <AvatarFallback className="text-blue-800">AC</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-blue-900">Admin Support</h4>
                  <p className="text-sm text-blue-700">Online • Ready to help</p>
                </div>
              </div>
              <ChatWidget
                participantId="admin-support"
                participantName="Customer Support"
                participantAvatar=""
                triggerButton={
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Start Chat
                  </button>
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Chats List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : chats.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-500">Start chatting with sellers when you browse products or have questions about orders</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {chats.map((chat) => (
              <Card key={chat.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={chat.otherParticipant.avatar} />
                        <AvatarFallback>
                          {chat.otherParticipant.name[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">
                            {chat.otherParticipant.name}
                          </h3>
                          <Badge className={getRoleColor(chat.otherParticipant.role)}>
                            {chat.otherParticipant.role}
                          </Badge>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive">
                              {chat.unreadCount} new
                            </Badge>
                          )}
                        </div>

                        {chat.product && (
                          <div className="flex items-center space-x-2 mt-1">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              About: {chat.product.name}
                            </span>
                          </div>
                        )}

                        {chat.order && (
                          <div className="flex items-center space-x-2 mt-1">
                            <ShoppingCart className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Order #{chat.order.id.slice(-8)} - {chat.order.status}
                            </span>
                          </div>
                        )}

                        <p className="text-sm text-gray-500 mt-1">
                          Last activity: {new Date(chat.lastMessageAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <ChatWidget
                      participantId={chat.otherParticipant.id}
                      participantName={chat.otherParticipant.name}
                      participantAvatar={chat.otherParticipant.avatar}
                      productId={chat.productId}
                      orderId={chat.orderId}
                      triggerButton={
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                          Open Chat
                        </button>
                      }
                    />
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