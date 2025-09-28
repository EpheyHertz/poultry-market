// Blog Post Types based on Prisma Schema

export interface BlogPostAuthor {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  _count?: {
    followers: number;
    blogPosts: number;
  };
}

export interface BlogPostTag {
  tag: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  category: string; // This maps to BlogPostCategory enum in Prisma
  viewCount: number;
  readingTime?: number | null;
  publishedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  author: BlogPostAuthor;
  tags: BlogPostTag[];
  _count: {
    likedBy: number;
    comments: number;
  };
}

// Extended type for blog post with full Prisma relations
export interface BlogPostWithRelations extends BlogPost {
  images: string[];
  metaDescription?: string | null;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: string | null;
  featured: boolean;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'ARCHIVED';
  shareCount: number;
  likes: number;
  views: number;
  scheduledAt?: string | Date | null;
  submittedAt?: string | Date | null;
  approvedAt?: string | Date | null;
  rejectedAt?: string | Date | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
  submissionNotes?: string | null;
}

// Blog Categories enum mapping
export const BLOG_CATEGORIES = {
  FARMING_TIPS: { name: 'Farming Tips', icon: '🌱', color: 'bg-green-100 text-green-800' },
  POULTRY_HEALTH: { name: 'Poultry Health', icon: '🏥', color: 'bg-red-100 text-red-800' },
  FEED_NUTRITION: { name: 'Feed & Nutrition', icon: '🌾', color: 'bg-yellow-100 text-yellow-800' },
  EQUIPMENT_GUIDES: { name: 'Equipment Guides', icon: '🔧', color: 'bg-gray-100 text-gray-800' },
  MARKET_TRENDS: { name: 'Market Trends', icon: '📈', color: 'bg-blue-100 text-blue-800' },
  SUCCESS_STORIES: { name: 'Success Stories', icon: '🏆', color: 'bg-orange-100 text-orange-800' },
  INDUSTRY_NEWS: { name: 'Industry News', icon: '📰', color: 'bg-purple-100 text-purple-800' },
  SEASONAL_ADVICE: { name: 'Seasonal Advice', icon: '🌤️', color: 'bg-cyan-100 text-cyan-800' },
  BEGINNER_GUIDES: { name: 'Beginner Guides', icon: '📚', color: 'bg-lime-100 text-lime-800' },
  ADVANCED_TECHNIQUES: { name: 'Advanced Techniques', icon: '🎯', color: 'bg-pink-100 text-pink-800' }
} as const;

export type BlogCategory = keyof typeof BLOG_CATEGORIES;