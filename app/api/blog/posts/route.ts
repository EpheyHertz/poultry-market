import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Create blog post schema
const createBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  featuredImage: z.string().url().optional(),
  images: z.array(z.string().url()).max(3, 'Maximum 3 images allowed').optional().default([]),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().optional(),
  category: z.enum([
    'FARMING_TIPS',
    'POULTRY_HEALTH',
    'FEED_NUTRITION',
    'EQUIPMENT_GUIDES',
    'MARKET_TRENDS',
    'SUCCESS_STORIES',
    'INDUSTRY_NEWS',
    'SEASONAL_ADVICE',
    'BEGINNER_GUIDES',
    'ADVANCED_TECHNIQUES'
  ]),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  featured: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().url().optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterImage: z.string().url().optional(),
});

// Generate URL-friendly slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Calculate reading time (average 200 words per minute)
function calculateReadingTime(content: string): number {
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / 200);
}

// GET - Fetch blog posts with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const status = searchParams.get('status');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');
    const authorId = searchParams.get('authorId');

    const where: any = {};

    // Build filter conditions
    if (category) where.category = category;
    if (status) {
      // For public blog, include both PUBLISHED and APPROVED posts
      if (status === 'PUBLISHED') {
        where.status = { in: ['PUBLISHED', 'APPROVED'] };
      } else {
        where.status = status;
      }
    } else {
      // Default to showing published and approved posts for public view
      where.status = { in: ['PUBLISHED', 'APPROVED'] };
    }
    if (featured) where.featured = featured === 'true';
    if (authorId) where.authorId = authorId;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            slug: tag
          }
        }
      };
    }

    // Get total count for pagination
    const totalPosts = await prisma.blogPost.count({ where });

    // Fetch posts with pagination
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
                blogPosts: true
              }
            }
          }
        },
        tags: {
          include: {
            tag: true
          }
        },
        _count: {
          select: {
            comments: {
              where: {
                isApproved: true
              }
            },
            likedBy: true // This matches the schema relationship name
          }
        }
      },
      orderBy: [
        { featured: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit,
    });
// console.log("Posts:",posts)
    const totalPages = Math.ceil(totalPosts / limit);

    return NextResponse.json({
      posts: posts.map(post => ({
        ...post,
        tags: post.tags.map(t => t.tag),
        commentCount: post._count.comments,
        likeCount: post._count.likedBy, 
        _count: {
          comments: post._count.comments,
          likes: post._count.likedBy 
        }
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

// POST - Create new blog post
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user can create blog posts (Admin or approved users)
    if (!['ADMIN', 'COMPANY', 'STAKEHOLDER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create blog posts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createBlogPostSchema.parse(body);

    // Generate unique slug
    let baseSlug = generateSlug(validatedData.title);
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.blogPost.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Calculate reading time
    const readingTime = calculateReadingTime(validatedData.content);

    // Create or connect tags
    const tagConnections = await Promise.all(
      validatedData.tags.map(async (tagName) => {
        const tagSlug = generateSlug(tagName);
        
        // Find or create tag
        const tag = await prisma.blogTag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: {
            name: tagName,
            slug: tagSlug
          }
        });

        return { tagId: tag.id };
      })
    );

    // Set publishedAt if status is PUBLISHED
    const publishedAt = validatedData.status === 'PUBLISHED' 
      ? validatedData.publishedAt ? new Date(validatedData.publishedAt) : new Date()
      : null;

    // Create blog post
    const blogPost = await prisma.blogPost.create({
      data: {
        ...validatedData,
        slug,
        readingTime,
        authorId: user.id,
        publishedAt,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
        tags: {
          create: tagConnections
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    return NextResponse.json({
      ...blogPost,
      tags: blogPost.tags.map(t => t.tag)
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}