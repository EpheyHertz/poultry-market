import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrCreateAuthorProfile } from '@/lib/author';
import { getBlogPosts } from '@/lib/blog/get-posts';
import { BLOG_PAGE_SIZE } from '@/lib/blog/listing-config';
import { z } from 'zod';
import { BlogPostCategory } from '@prisma/client';


// Create blog post schema
const createBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  featuredImage: z.string().url().optional(),
  images: z.array(z.string().url()).max(3, 'Maximum 3 images allowed').optional().default([]),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().optional(),
  category: z.nativeEnum(BlogPostCategory),
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
    const parsedPage = parseInt(searchParams.get('page') || '1');
    const parsedLimit = parseInt(searchParams.get('limit') || String(BLOG_PAGE_SIZE));
    const featured = searchParams.get('featured');
    const status = searchParams.get('status');

    // Delegate to the shared data layer so SSR (`/blog`) and client-side paging
    // use exactly the same ordering. If they diverged, offset pagination would
    // silently duplicate or skip posts between page 1 and page 2.
    const result = await getBlogPosts({
      page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : BLOG_PAGE_SIZE,
      category: searchParams.get('category') || undefined,
      tag: searchParams.get('tag') || undefined,
      search: searchParams.get('search') || undefined,
      authorId: searchParams.get('authorId') || undefined,
      sort: searchParams.get('sort'),
      featured: featured ? featured === 'true' : undefined,
      status: (status as any) || undefined,
    });

    return NextResponse.json(result);

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

    // Get or create author profile (auto-creates if user doesn't have one)
    const { id: authorProfileId, isNew: isNewProfile } = await getOrCreateAuthorProfile(user.id);

    // Create blog post
    const blogPost = await prisma.blogPost.create({
      data: {
        ...validatedData,
        slug,
        readingTime,
        authorId: user.id,
        authorProfileId,
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