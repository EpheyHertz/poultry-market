import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendBlogSubmissionAcknowledgmentToAuthor, sendBlogSubmissionToAdmin, emailTemplates, sendEmail } from '@/lib/email';

// Update blog post schema
const updateBlogPostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  featuredImage: z.string().optional().or(z.literal('')),
  images: z.array(z.string()).max(3, 'Maximum 3 images allowed').optional(),
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
  ]).optional(),
  tags: z.array(z.string()).optional(),
  submissionNotes: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  featured: z.boolean().optional(),
  publishedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional().or(z.literal('')),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterImage: z.string().optional().or(z.literal('')),
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

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

// GET - Fetch single blog post by slug
export async function GET(
  request: NextRequest
) {
  try {
    // Get the slug from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const slug = pathParts[pathParts.length - 1] || ''; // Get the last part (slug)
    
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            bio: true,
            _count: {
              select: {
                blogPosts: true,
                followers: true,
                following: true
              }
            }
          }
        },
        tags: {
          include: {
            tag: true
          }
        },
        comments: {
          where: {
            isApproved: true,
            parentId: null // Only top-level comments
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            replies: {
              where: {
                isApproved: true
              },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              },
              orderBy: {
                createdAt: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            likedBy: true,
            comments: true
          }
        }
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check if post should be visible
    const user = await getCurrentUser();
    const isAuthor = user?.id === post.authorId;
    const isAdmin = user?.role === 'ADMIN';

    if (post.status !== 'PUBLISHED' && !isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Increment view count (only for published posts)
    if (post.status === 'PUBLISHED') {
      await prisma.blogPost.update({
        where: { slug },
        data: { viewCount: { increment: 1 } }
      });
    }

    // Get related posts (same category, excluding current post)
    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        category: post.category,
        status: 'PUBLISHED',
        id: { not: post.id }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: 3
    });

    return NextResponse.json({
      ...post,
      _count: {
        likes: post._count.likedBy,
        comments: post._count.comments
      },
      tags: post.tags.map(t => t.tag),
      relatedPosts: relatedPosts.map(p => ({
        ...p,
        tags: p.tags.map(t => t.tag)
      }))
    });

  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

// PUT - Update blog post
export async function PUT(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the slug from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const slug = pathParts[pathParts.length - 1] || ''; // Get the last part (slug)
    
    // Find existing post with full details for email
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug },
      include: { 
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check permissions - ALL blogs are editable by their owner
    const isAuthor = user.id === existingPost.authorId;
    const isAdmin = user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateBlogPostSchema.parse(body);

    let updateData: any = { ...validatedData };
    let requiresReapproval = false;
    const previousStatus = existingPost.status;

    // Check if content has meaningfully changed (requires re-approval for published posts)
    const contentChanged = validatedData.title !== existingPost.title || 
                          validatedData.content !== existingPost.content ||
                          validatedData.excerpt !== existingPost.excerpt;

    // If the post is published/approved and content changed, mark for re-approval
    if ((previousStatus === 'PUBLISHED' || previousStatus === 'APPROVED') && contentChanged && !isAdmin) {
      updateData.status = 'PENDING_APPROVAL';
      updateData.submittedAt = new Date();
      requiresReapproval = true;
    }

    // If the post was rejected and being resubmitted
    if (previousStatus === 'REJECTED') {
      updateData.status = 'PENDING_APPROVAL';
      updateData.submittedAt = new Date();
      updateData.rejectionReason = null; // Clear previous rejection reason
      requiresReapproval = true;
    }

    // If the post was a draft and being submitted
    if (previousStatus === 'DRAFT' && contentChanged) {
      updateData.status = 'PENDING_APPROVAL';
      updateData.submittedAt = new Date();
      requiresReapproval = true;
    }

    // Generate new slug if title changed
    if (validatedData.title && validatedData.title !== existingPost.title) {
      let baseSlug = generateSlug(validatedData.title);
      let newSlug = baseSlug;
      let counter = 1;

      while (await prisma.blogPost.findFirst({ 
        where: { slug: newSlug, id: { not: existingPost.id } } 
      })) {
        newSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      updateData.slug = newSlug;
    }

    // Recalculate reading time if content changed
    if (validatedData.content) {
      updateData.readingTime = calculateReadingTime(validatedData.content);
    }

    // Handle status changes (admin only)
    if (validatedData.status === 'PUBLISHED' && isAdmin && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    // Handle scheduled publishing
    if (validatedData.scheduledAt) {
      updateData.scheduledAt = new Date(validatedData.scheduledAt);
    }

    // Handle tags update
    if (validatedData.tags) {
      // Delete existing tag relationships
      await prisma.blogPostTag.deleteMany({
        where: { postId: existingPost.id }
      });

      // Create new tag relationships
      const tagConnections = await Promise.all(
        validatedData.tags.map(async (tagName) => {
          const tagSlug = generateSlug(tagName);
          
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

      updateData.tags = {
        create: tagConnections
      };
    }

    // Update blog post
    const updatedPost = await prisma.blogPost.update({
      where: { slug },
      data: updateData,
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

    // Send email notifications if re-approval is required
    if (requiresReapproval) {
      try {
        // Send confirmation to author
        if (updatedPost.author.email) {
          const authorHtml = emailTemplates.blogSubmissionAcknowledgment(
            {
              title: updatedPost.title,
              slug: updatedPost.slug,
              category: updatedPost.category,
              submissionNotes: updatedPost.submissionNotes,
              featuredImage: updatedPost.featuredImage,
              readingTime: updatedPost.readingTime,
              submittedAt: updatedPost.submittedAt || new Date(),
              author: {
                id: updatedPost.author.id,
                name: updatedPost.author.name,
                email: updatedPost.author.email,
              },
              tags: updatedPost.tags,
            },
            { variant: 'edit' }
          );

          await sendEmail({
            to: updatedPost.author.email,
            subject: `Your blog update "${updatedPost.title}" is under review`,
            html: authorHtml,
          });
        }

        // Send notification to admin
        const adminEmail = process.env.BLOG_ADMIN_EMAIL || process.env.SUPPORT_EMAIL;
        if (adminEmail) {
          const adminHtml = emailTemplates.blogSubmissionAdminNotification(
            {
              title: updatedPost.title,
              slug: updatedPost.slug,
              category: updatedPost.category,
              submissionNotes: updatedPost.submissionNotes,
              featuredImage: updatedPost.featuredImage,
              readingTime: updatedPost.readingTime,
              submittedAt: updatedPost.submittedAt || new Date(),
              author: {
                id: updatedPost.author.id,
                name: updatedPost.author.name,
                email: updatedPost.author.email,
              },
              tags: updatedPost.tags,
            },
            { variant: 'edit' }
          );

          await sendEmail({
            to: adminEmail,
            subject: `Blog Update Pending Review: "${updatedPost.title}"`,
            html: adminHtml,
          });
        }
      } catch (emailError) {
        console.error('Failed to send blog update notification emails:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      ...updatedPost,
      tags: updatedPost.tags.map(t => t.tag),
      resubmitted: requiresReapproval
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    );
  }
}

// DELETE - Delete blog post
export async function DELETE(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the slug from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const slug = pathParts[pathParts.length - 1] || ''; // Get the last part (slug)
    
    // Find existing post
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug },
      select: { 
        id: true, 
        authorId: true 
      }
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAuthor = user.id === existingPost.authorId;
    const isAdmin = user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Delete blog post (cascade will handle related records)
    await prisma.blogPost.delete({
      where: { slug }
    });

    return NextResponse.json({
      message: 'Blog post deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
}