import { prisma } from '@/lib/prisma';

export interface GetPostsParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  tag?: string;
  featured?: boolean;
  authorId?: string;
  status?: 'PUBLISHED' | 'APPROVED' | 'DRAFT' | 'PENDING' | 'REJECTED';
}

export interface BlogPostAuthor {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  _count?: {
    followers: number;
    blogPosts: number;
  };
}

/**
 * Shape returned to the client. Intentionally loose (`any` spread of the Prisma
 * record) so it stays in sync with `/api/blog/posts` without duplicating the
 * full generated BlogPost type.
 */
export type PostWithRelations = Record<string, any> & {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  images: string[];
  category: string;
  views: number;
  featured: boolean;
  readingTime: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  author: BlogPostAuthor;
  tags: Array<{ id: string; name: string; slug: string }>;
  authorUsername: string | null;
  authorDisplayName: string;
  commentCount: number;
  likeCount: number;
  _count: {
    comments: number;
    likes: number;
  };
};


export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface GetPostsResult {
  posts: PostWithRelations[];
  pagination: PaginationInfo;
}

export async function getBlogPosts(params: GetPostsParams = {}): Promise<GetPostsResult> {
  const {
    page = 1,
    limit = 12,
    category,
    search,
    tag,
    featured,
    authorId,
    status,
  } = params;

  // Build where clause
  const where: any = {};

  if (category) {
    where.category = category;
  }

  if (status) {
    if (status === 'PUBLISHED') {
      where.status = { in: ['PUBLISHED', 'APPROVED'] };
    } else {
      where.status = status;
    }
  } else {
    // Default: only show published/approved posts
    where.status = { in: ['PUBLISHED', 'APPROVED'] };
  }

  if (featured !== undefined) {
    where.featured = featured;
  }

  if (authorId) {
    where.authorId = authorId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (tag) {
    where.tags = {
      some: {
        tag: {
          slug: tag,
        },
      },
    };
  }

  // Get total count
  const totalPosts = await prisma.blogPost.count({ where });

  // Calculate pagination
  const totalPages = Math.ceil(totalPosts / limit);
  const skip = (page - 1) * limit;

  // Fetch posts with all relations
  const posts = await prisma.blogPost.findMany({
    where,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
          _count: {
            select: {
              followers: true,
              blogPosts: true,
            },
          },
        },
      },
      authorProfile: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          bio: true,
          isVerified: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      _count: {
        select: {
          comments: {
            where: {
              isApproved: true,
            },
          },
          likedBy: true,
        },
      },
    },
    orderBy: [
      { featured: 'desc' },
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    skip,
    take: limit,
  });

  // Map posts to match API response shape
  const mappedPosts: PostWithRelations[] = posts.map((post) => {
    const authorProfile = post.authorProfile;
    const author = post.author;

    return {
      ...post,
      author: {
        ...author,
        name: authorProfile?.displayName || author.name,
        displayName: authorProfile?.displayName || author.name,
        username: authorProfile?.username || null,
        avatar: authorProfile?.avatarUrl || author.avatar,
        avatarUrl: authorProfile?.avatarUrl || author.avatar,
        bio: authorProfile?.bio || null,
        isVerified: authorProfile?.isVerified || false,
        _count: author._count,
      },
      authorUsername: authorProfile?.username || null,
      authorDisplayName: authorProfile?.displayName || author.name,
      tags: post.tags.map((t) => t.tag),
      commentCount: post._count.comments,
      likeCount: post._count.likedBy,
      _count: {
        comments: post._count.comments,
        likes: post._count.likedBy,
      },
    };
  });

  return {
    posts: mappedPosts,
    pagination: {
      currentPage: page,
      totalPages,
      totalPosts,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
