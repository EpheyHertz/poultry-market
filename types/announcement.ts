export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  authorId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    email: string;
  };
  productId?: string;
  product?: {
    id: string;
    name: string;
    slug?: string;
    images: string[];
  };
  targetRoles: string[];
  isGlobal: boolean;
  publishAt?: string;
  expiresAt?: string;
  imageUrl?: string;
  attachmentUrl?: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  
  // Computed fields
  isViewed?: boolean;
  userReaction?: string;
  reactionCounts?: {
    [key: string]: number;
  };
}

export type AnnouncementType = 
  | 'SALE'
  | 'DISCOUNT'
  | 'SLAUGHTER_SCHEDULE'
  | 'PRODUCT_LAUNCH'
  | 'GENERAL'
  | 'URGENT';

export type AnnouncementStatus = 
  | 'DRAFT'
  | 'PUBLISHED'
  | 'EXPIRED'
  | 'ARCHIVED';

export interface AnnouncementView {
  id: string;
  announcementId: string;
  userId: string;
  viewedAt: string;
}

export interface AnnouncementReaction {
  id: string;
  announcementId: string;
  userId: string;
  reaction: string;
  createdAt: string;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  type: AnnouncementType;
  productId?: string;
  targetRoles: string[];
  isGlobal: boolean;
  publishAt?: string;
  expiresAt?: string;
  imageUrl?: string;
  attachmentUrl?: string;
}

export interface UpdateAnnouncementData extends Partial<CreateAnnouncementData> {
  status?: AnnouncementStatus;
}

export const ANNOUNCEMENT_TYPES = {
  SALE: { label: 'Sale', color: 'bg-green-100 text-green-800', icon: '🏷️' },
  DISCOUNT: { label: 'Discount', color: 'bg-orange-100 text-orange-800', icon: '💰' },
  SLAUGHTER_SCHEDULE: { label: 'Slaughter Schedule', color: 'bg-red-100 text-red-800', icon: '📅' },
  PRODUCT_LAUNCH: { label: 'Product Launch', color: 'bg-blue-100 text-blue-800', icon: '🚀' },
  GENERAL: { label: 'General', color: 'bg-gray-100 text-gray-800', icon: '📢' },
  URGENT: { label: 'Urgent', color: 'bg-red-500 text-white', icon: '⚠️' }
} as const;

export const ANNOUNCEMENT_STATUSES = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-800' },
  EXPIRED: { label: 'Expired', color: 'bg-yellow-100 text-yellow-800' },
  ARCHIVED: { label: 'Archived', color: 'bg-red-100 text-red-800' }
} as const;

export const AVAILABLE_REACTIONS = ['👍', '👎', '❤️', '😮', '😂', '😢', '😡'] as const;
