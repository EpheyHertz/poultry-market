import { create } from 'zustand';
import { apiService } from '../services/api';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: string;
  sender: {
    name: string;
    avatar?: string;
  };
}

interface Chat {
  id: string;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: string;
  }>;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

interface ChatState {
  chats: Chat[];
  messages: Message[];
  currentChat: Chat | null;
  loading: boolean;
  error: string | null;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, type?: string) => Promise<void>;
  createChat: (participantId: string) => Promise<Chat>;
  setCurrentChat: (chat: Chat | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: [],
  currentChat: null,
  loading: false,
  error: null,

  fetchChats: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.getChats();
      set({ chats: response.chats, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchMessages: async (chatId) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.getChatMessages(chatId);
      set({ messages: response.messages, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  sendMessage: async (chatId, content, type = 'text') => {
    try {
      const message = await apiService.sendMessage(chatId, { content, type });
      set(state => ({
        messages: [...state.messages, message]
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  createChat: async (participantId) => {
    set({ loading: true, error: null });
    try {
      const chat = await apiService.createChat(participantId);
      set(state => ({
        chats: [chat, ...state.chats],
        loading: false
      }));
      return chat;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  setCurrentChat: (chat) => {
    set({ currentChat: chat });
  },
}));