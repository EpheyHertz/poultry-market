// Author Profile Utilities
import { prisma } from './prisma';

/**
 * Generate a URL-safe username from display name
 */
export function generateUsername(displayName: string): string {
  return displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 30); // Max 30 characters
}

/**
 * Validate username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or less' };
  }
  
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$|^[a-z0-9]$/.test(username)) {
    return { 
      valid: false, 
      error: 'Username must start and end with a letter or number, and can only contain lowercase letters, numbers, hyphens, and underscores' 
    };
  }
  
  // Reserved usernames
  const reserved = [
    'admin', 'administrator', 'mod', 'moderator', 'staff', 'support',
    'help', 'info', 'contact', 'blog', 'api', 'auth', 'login', 'signup',
    'register', 'settings', 'profile', 'dashboard', 'author', 'authors',
    'post', 'posts', 'new', 'edit', 'delete', 'create', 'update',
    'poultrymarket', 'poultry', 'system', 'root', 'null', 'undefined'
  ];
  
  if (reserved.includes(username.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }
  
  return { valid: true };
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const existing = await prisma.authorProfile.findFirst({
    where: {
      username: username.toLowerCase(),
      ...(excludeUserId && { userId: { not: excludeUserId } })
    }
  });
  
  return !existing;
}

/**
 * Generate unique username by appending numbers if needed
 */
export async function generateUniqueUsername(baseName: string): Promise<string> {
  let username = generateUsername(baseName);
  
  // Ensure minimum length
  if (username.length < 3) {
    username = `author-${username}`;
  }
  
  let counter = 1;
  
  while (!(await isUsernameAvailable(username))) {
    username = `${generateUsername(baseName).substring(0, 26)}-${counter}`;
    counter++;
    
    if (counter > 100) {
      // Fallback to random suffix
      username = `${generateUsername(baseName).substring(0, 22)}-${Date.now().toString(36)}`;
      break;
    }
  }
  
  return username;
}

/**
 * Get existing author profile or create one automatically
 * Use this when a user creates a blog post to ensure they have a profile
 */
export async function getOrCreateAuthorProfile(userId: string): Promise<{ id: string; isNew: boolean }> {
  // Check if profile already exists
  const existingProfile = await prisma.authorProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  
  if (existingProfile) {
    return { id: existingProfile.id, isNew: false };
  }
  
  // Get user details to create profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      createdAt: true
    }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Generate display name and username
  const displayName = user.name || user.email?.split('@')[0] || 'Author';
  const username = await generateUniqueUsername(displayName);
  
  // Create the author profile
  const newProfile = await prisma.authorProfile.create({
    data: {
      userId: user.id,
      displayName,
      username,
      bio: `Author on Poultry Market since ${new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      avatarUrl: user.avatar,
      isPublic: true,
      isVerified: false
    },
    select: { id: true }
  });
  
  return { id: newProfile.id, isNew: true };
}

/**
 * Calculate author stats
 */
export async function calculateAuthorStats(authorProfileId: string) {
  const [postsStats, viewsResult] = await Promise.all([
    prisma.blogPost.aggregate({
      where: { 
        authorProfileId,
        status: 'PUBLISHED'
      },
      _count: true,
      _sum: {
        viewCount: true,
        likes: true
      }
    }),
    prisma.blogPostView.aggregate({
      where: {
        post: { authorProfileId }
      },
      _count: true
    })
  ]);
  
  return {
    totalPosts: postsStats._count || 0,
    totalViews: postsStats._sum.viewCount || 0,
    totalLikes: postsStats._sum.likes || 0,
    uniqueViews: viewsResult._count || 0
  };
}

/**
 * Update denormalized author stats
 */
export async function updateAuthorStats(authorProfileId: string) {
  const stats = await calculateAuthorStats(authorProfileId);
  
  await prisma.authorProfile.update({
    where: { id: authorProfileId },
    data: {
      totalPosts: stats.totalPosts,
      totalViews: stats.totalViews,
      totalLikes: stats.totalLikes
    }
  });
  
  return stats;
}

/**
 * Link existing blog posts to author profile
 * Call this when an author profile is created to link any existing posts
 */
export async function linkExistingPostsToProfile(userId: string, authorProfileId: string) {
  // Find all posts by this user that don't have an author profile linked
  const result = await prisma.blogPost.updateMany({
    where: {
      authorId: userId,
      authorProfileId: null
    },
    data: {
      authorProfileId: authorProfileId
    }
  });
  
  // Update author stats after linking posts
  if (result.count > 0) {
    await updateAuthorStats(authorProfileId);
  }
  
  return result.count;
}

/**
 * Get author's public profile with posts
 */
export async function getPublicAuthorProfile(username: string) {
  const profile = await prisma.authorProfile.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: {
              followers: true,
              following: true
            }
          }
        }
      },
      blogPosts: {
        where: {
          status: 'PUBLISHED'
        },
        orderBy: {
          publishedAt: 'desc'
        },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          category: true,
          readingTime: true,
          viewCount: true,
          publishedAt: true,
          tags: {
            include: {
              tag: true
            }
          },
          _count: {
            select: {
              likedBy: true,
              comments: true
            }
          }
        }
      }
    }
  });
  
  if (!profile || !profile.isPublic) {
    return null;
  }
  
  return profile;
}

/**
 * Get author dashboard data
 */
export async function getAuthorDashboardData(userId: string) {
  const profile = await prisma.authorProfile.findUnique({
    where: { userId }
  });
  
  if (!profile) {
    return null;
  }
  
  const [
    recentPosts,
    postsByStatus,
    recentComments,
    popularPosts,
    viewsOverTime
  ] = await Promise.all([
    // Recent posts
    prisma.blogPost.findMany({
      where: { authorProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        viewCount: true,
        publishedAt: true,
        rejectionReason: true,
        _count: {
          select: {
            likedBy: true,
            comments: true
          }
        }
      }
    }),
    
    // Posts grouped by status
    prisma.blogPost.groupBy({
      by: ['status'],
      where: { authorProfileId: profile.id },
      _count: true
    }),
    
    // Recent comments on author's posts
    prisma.blogComment.findMany({
      where: {
        post: { authorProfileId: profile.id },
        isApproved: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        post: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    }),
    
    // Popular posts (by views)
    prisma.blogPost.findMany({
      where: { 
        authorProfileId: profile.id,
        status: 'PUBLISHED'
      },
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        _count: {
          select: {
            likedBy: true
          }
        }
      }
    }),
    
    // Views over last 30 days
    prisma.blogPostView.groupBy({
      by: ['createdAt'],
      where: {
        post: { authorProfileId: profile.id },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      _count: true
    })
  ]);
  
  // Transform posts by status to object
  const statusCounts = postsByStatus.reduce((acc, item) => {
    acc[item.status] = item._count;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    profile,
    stats: {
      totalPosts: profile.totalPosts,
      totalViews: profile.totalViews,
      totalLikes: profile.totalLikes,
      drafts: statusCounts['DRAFT'] || 0,
      pending: statusCounts['PENDING_APPROVAL'] || 0,
      published: statusCounts['PUBLISHED'] || 0,
      rejected: statusCounts['REJECTED'] || 0
    },
    recentPosts,
    recentComments,
    popularPosts,
    viewsOverTime
  };
}
