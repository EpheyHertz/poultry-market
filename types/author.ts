// Author Profile Types

export interface AuthorProfile {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  tagline?: string | null;
  website?: string | null;
  location?: string | null;
  occupation?: string | null;
  company?: string | null;
  expertise: string[];
  
  // Social Links
  twitterHandle?: string | null;
  linkedinUrl?: string | null;
  githubUsername?: string | null;
  facebookUrl?: string | null;
  instagramHandle?: string | null;
  youtubeChannel?: string | null;
  
  // Settings
  isPublic: boolean;
  isVerified: boolean;
  showEmail: boolean;
  allowComments: boolean;
  emailOnComment: boolean;
  emailOnFollow: boolean;
  emailOnLike: boolean;
  
  // Stats
  totalViews: number;
  totalLikes: number;
  totalPosts: number;
  totalComments: number;
  
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuthorProfileWithUser extends AuthorProfile {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

export interface AuthorProfileWithPosts extends AuthorProfile {
  blogPosts: AuthorBlogPostSummary[];
  _count?: {
    blogPosts: number;
  };
}

export interface AuthorBlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  category: string;
  status: string;
  publishedAt?: Date | string | null;
  viewCount: number;
  likes: number;
  estimatedReadTime?: number | null;
  _count?: {
    comments: number;
    likedBy: number;
  };
}

export interface AuthorPublicProfile {
  id: string;
  displayName: string;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  tagline?: string | null;
  website?: string | null;
  location?: string | null;
  occupation?: string | null;
  company?: string | null;
  expertise: string[];
  isVerified: boolean;
  
  // Social Links
  twitterHandle?: string | null;
  linkedinUrl?: string | null;
  githubUsername?: string | null;
  facebookUrl?: string | null;
  instagramHandle?: string | null;
  youtubeChannel?: string | null;
  
  // Public Stats
  totalViews: number;
  totalLikes: number;
  totalPosts: number;
  
  createdAt: Date | string;
  
  // Relations
  blogPosts: AuthorBlogPostSummary[];
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    _count?: {
      followers: number;
      following: number;
    };
  };
}

// Form types
export interface CreateAuthorProfileInput {
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  tagline?: string;
  website?: string;
  location?: string;
  occupation?: string;
  company?: string;
  expertise?: string[];
  twitterHandle?: string;
  linkedinUrl?: string;
  githubUsername?: string;
  facebookUrl?: string;
  instagramHandle?: string;
  youtubeChannel?: string;
  isPublic?: boolean;
  showEmail?: boolean;
  allowComments?: boolean;
  emailOnComment?: boolean;
  emailOnFollow?: boolean;
  emailOnLike?: boolean;
}

export interface UpdateAuthorProfileInput extends Partial<CreateAuthorProfileInput> {}

// Dashboard types
export interface AuthorDashboardStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  pendingPosts: number;
  rejectedPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  viewsThisMonth: number;
  likesThisMonth: number;
  topPost?: AuthorBlogPostSummary;
}

export interface AuthorAnalytics {
  viewsByDay: { date: string; views: number }[];
  viewsByPost: { postId: string; title: string; views: number }[];
  viewsByCountry: { country: string; views: number }[];
  viewsByDevice: { device: string; views: number }[];
  viewsByReferrer: { referrer: string; views: number }[];
  engagementRate: number;
  avgReadDuration: number;
  topPerformingPosts: AuthorBlogPostSummary[];
  recentComments: {
    id: string;
    content: string;
    postTitle: string;
    authorName: string;
    createdAt: string;
  }[];
}

// Validation helpers
export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'root',
  'system',
  'moderator',
  'mod',
  'support',
  'help',
  'blog',
  'author',
  'authors',
  'user',
  'users',
  'api',
  'www',
  'mail',
  'email',
  'account',
  'accounts',
  'profile',
  'profiles',
  'settings',
  'dashboard',
  'login',
  'logout',
  'register',
  'signup',
  'signin',
  'auth',
  'oauth',
  'callback',
  'static',
  'assets',
  'images',
  'img',
  'css',
  'js',
  'fonts',
  'media',
  'uploads',
  'download',
  'downloads',
  'search',
  'explore',
  'trending',
  'popular',
  'featured',
  'new',
  'latest',
  'category',
  'categories',
  'tag',
  'tags',
  'post',
  'posts',
  'article',
  'articles',
  'null',
  'undefined',
  'anonymous',
  'guest',
  'test',
  'demo',
];

export function isValidUsername(username: string): boolean {
  if (!username) return false;
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) return false;
  if (!USERNAME_REGEX.test(username)) return false;
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) return false;
  return true;
}

export function sanitizeUsername(username: string): string {
  return username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, USERNAME_MAX_LENGTH);
}
