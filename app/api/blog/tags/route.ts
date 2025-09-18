import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
});

// Generate URL-friendly slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET - Fetch all tags with post counts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withCounts = searchParams.get('withCounts') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const tags = await prisma.blogTag.findMany({
      include: withCounts ? {
        posts: {
          select: {
            post: {
              select: {
                status: true
              }
            }
          }
        }
      } : undefined,
      orderBy: {
        name: 'asc'
      },
      take: limit,
    });

    const tagsWithCounts = tags.map(tag => {
      const tagWithPosts = tag as any; // Type assertion for conditional include
      const postCount = withCounts && tagWithPosts.posts
        ? tagWithPosts.posts.filter((p: any) => p.post.status === 'PUBLISHED').length
        : undefined;
      
      return {
        ...tag,
        postCount,
        posts: undefined // Remove posts array from response
      };
    });

    return NextResponse.json({ tags: tagsWithCounts });

  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST - Create new tag (Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createTagSchema.parse(body);

    // Generate unique slug
    let baseSlug = generateSlug(validatedData.name);
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.blogTag.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const tag = await prisma.blogTag.create({
      data: {
        ...validatedData,
        slug
      }
    });

    return NextResponse.json(tag);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}