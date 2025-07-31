export interface Chat {
  id: string;
  participant1: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  participant2: {
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
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface MessageFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  mimeType: string;
}

export interface Message {
  id: string;
  chatId?: string; // Optional for compatibility
  content: string;
  type: string;
  images: string[];
  files: MessageFile[];
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  reactions: MessageReaction[];
  replyTo?: {
    id: string;
    content: string;
    sender: {
      name: string;
    };
  };
  readAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}
