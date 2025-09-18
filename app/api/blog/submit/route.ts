import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Blog submission schema
const blogSubmissionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(300, 'Content must be at least 300 characters'),
  excerpt: z.string().optional(),
  featuredImage: z.union([
    z.string().url('Invalid image URL'),
    z.string().regex(/^\//, 'Must be a valid path or URL'), // Allow relative paths starting with /
    z.literal(''),
    z.undefined()
  ]).optional().transform(val => val === '' ? undefined : val),
  images: z.array(
    z.union([
      z.string().url('Invalid image URL'), // Cloudinary URLs
      z.string().regex(/^\//, 'Must be a valid path or URL'), // Local paths
      z.literal('')
    ])
  ).max(3, 'Maximum 3 images allowed')
    .optional()
    .default([])
    .transform(val => val?.filter(img => img !== '') || []),
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
  submissionNotes: z.string().optional(),
  authorName: z.string().min(1, 'Author name is required'),
  authorEmail: z.string().email('Valid email is required'),
  authorPhone: z.string().optional(),
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

// POST - Submit a new blog post for approval
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Debug: Log the received data (remove in production)
    console.log('Received blog submission data:', {
      title: body.title,
      featuredImage: body.featuredImage,
      images: body.images,
      category: body.category,
    });

    const validatedData = blogSubmissionSchema.parse(body);

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

    // Check if user already exists or create a new one
    let author = await prisma.user.findUnique({
      where: { email: validatedData.authorEmail }
    });

    if (!author) {
      // Create a new user account for the blog contributor
      author = await prisma.user.create({
        data: {
          email: validatedData.authorEmail,
          name: validatedData.authorName,
          phone: validatedData.authorPhone,
          role: 'CUSTOMER', // Default role for blog contributors
          isVerified: false, // They'll need to verify their email
        }
      });
    }

    // Create or connect tags
    const tagConnections = await Promise.all(
      validatedData.tags.map(async (tagName) => {
        const tagSlug = generateSlug(tagName);
        
        // Find or create tag
        let tag = await prisma.blogTag.findUnique({
          where: { slug: tagSlug }
        });

        if (!tag) {
          tag = await prisma.blogTag.create({
            data: {
              name: tagName,
              slug: tagSlug,
              description: `Posts about ${tagName}`
            }
          });
        }

        return {
          tag: {
            connect: { id: tag.id }
          }
        };
      })
    );

    // Create the blog post with PENDING_APPROVAL status
    const blogPost = await prisma.blogPost.create({
      data: {
        title: validatedData.title,
        slug,
        content: validatedData.content,
        excerpt: validatedData.excerpt || validatedData.content.substring(0, 200) + '...',
        featuredImage: validatedData.featuredImage,
        images: validatedData.images,
        category: validatedData.category as any,
        status: 'PENDING_APPROVAL',
        featured: false,
        readingTime,
        submissionNotes: validatedData.submissionNotes,
        submittedAt: new Date(),
        authorId: author.id,
        tags: {
          create: tagConnections
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // TODO: Send notification to admins about new submission
    // This would be implemented in the notifications system

    // TODO: Send confirmation email to the author
    // This would be implemented with the email system

    return NextResponse.json({
      success: true,
      message: 'Blog post submitted successfully',
      blogPost: {
        id: blogPost.id,
        title: blogPost.title,
        slug: blogPost.slug,
        status: blogPost.status,
        submittedAt: blogPost.submittedAt,
        author: blogPost.author
      }
    });

  } catch (error) {
    console.error('Error submitting blog post:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit blog post' },
      { status: 500 }
    );
  }
}