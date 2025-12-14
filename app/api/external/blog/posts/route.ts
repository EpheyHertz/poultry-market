import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey } from '@/lib/api-keys';
import { createNotification } from '@/lib/notifications';
import { getOrCreateAuthorProfile } from '@/lib/author';
import { BlogPostCategory, BlogPostStatus } from '@prisma/client';

const submissionRateLimit = new Map<string, { count: number; resetTime: number }>();
const SUBMISSION_RATE_LIMIT_MAX = 5;
const SUBMISSION_RATE_LIMIT_WINDOW = 15 * 60 * 1000;

function checkRateLimit(key: string) {
  const now = Date.now();
  const snapshot = submissionRateLimit.get(key);

  if (!snapshot || now > snapshot.resetTime) {
    submissionRateLimit.set(key, { count: 1, resetTime: now + SUBMISSION_RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: SUBMISSION_RATE_LIMIT_MAX - 1 };
  }

  if (snapshot.count >= SUBMISSION_RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  snapshot.count += 1;
  return { allowed: true, remaining: SUBMISSION_RATE_LIMIT_MAX - snapshot.count };
}

function getClientIdentifier(apiKey: string | null, request: Request) {
  if (apiKey) {
    return `apiKey:${apiKey}`;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

const payloadSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(50),
  excerpt: z.string().max(300).optional(),
  category: z.nativeEnum(BlogPostCategory),
  tags: z.array(z.string().min(2).max(30)).max(10).optional().default([]),
  featuredImage: z.string().url().optional(),
  metaDescription: z.string().max(160).optional(),
});

/**
 * Calculate precise reading time in minutes based on content analysis.
 * - Average adult reading speed: ~200-250 WPM for technical content
 * - Accounts for code blocks (slower reading), images, and headings
 */
function calculateReadingTime(content: string): number {
  const WORDS_PER_MINUTE = 220; // Conservative estimate for technical/blog content
  const CODE_BLOCK_SECONDS = 12; // Extra seconds per code block
  const IMAGE_SECONDS = 10; // Seconds to process each image reference
  const HEADING_SECONDS = 2; // Brief pause per heading

  // Strip HTML tags for accurate word count
  const textOnly = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/```[\s\S]*?```/g, (match) => {
      // Replace code blocks with marker to count them separately
      return ' __CODE_BLOCK__ ';
    })
    .replace(/`[^`]+`/g, ' '); // Remove inline code

  // Count words (split on whitespace, filter empty)
  const words = textOnly
    .split(/\s+/)
    .filter((word) => word.length > 0 && word !== '__CODE_BLOCK__');
  const wordCount = words.length;

  // Count code blocks (fenced with ```)
  const codeBlockMatches = content.match(/```[\s\S]*?```/g);
  const codeBlockCount = codeBlockMatches ? codeBlockMatches.length : 0;

  // Count images (markdown ![...](...) or <img> tags)
  const imageMatches = content.match(/!\[.*?\]\(.*?\)|<img[^>]*>/gi);
  const imageCount = imageMatches ? imageMatches.length : 0;

  // Count headings (markdown # or <h1>-<h6>)
  const headingMatches = content.match(/^#{1,6}\s|<h[1-6][^>]*>/gim);
  const headingCount = headingMatches ? headingMatches.length : 0;

  // Base reading time from words
  const baseMinutes = wordCount / WORDS_PER_MINUTE;

  // Additional time for code blocks, images, headings (convert to minutes)
  const codeTime = (codeBlockCount * CODE_BLOCK_SECONDS) / 60;
  const imageTime = (imageCount * IMAGE_SECONDS) / 60;
  const headingTime = (headingCount * HEADING_SECONDS) / 60;

  const totalMinutes = baseMinutes + codeTime + imageTime + headingTime;

  // Round to nearest 0.5 for precision, minimum 1 minute
  const rounded = Math.round(totalMinutes * 2) / 2;
  return Math.max(1, rounded);
}

/**
 * Generate table of contents from content headings
 */
function generateTableOfContents(content: string): { id: string; text: string; level: number }[] {
  const toc: { id: string; text: string; level: number }[] = [];
  
  // Match markdown headings (## Heading)
  const markdownHeadings = content.matchAll(/^(#{1,6})\s+(.+)$/gm);
  for (const match of markdownHeadings) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    toc.push({ id, text, level });
  }
  
  // Match HTML headings (<h1>Heading</h1>)
  const htmlHeadings = content.matchAll(/<h([1-6])[^>]*>([^<]+)<\/h\1>/gi);
  for (const match of htmlHeadings) {
    const level = parseInt(match[1]);
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    toc.push({ id, text, level });
  }
  
  return toc;
}

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const authResult = await authenticateApiKey(apiKey || undefined);

    if (!authResult) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { user } = authResult;

    const identifier = getClientIdentifier(apiKey, request);
    const rateLimitResult = checkRateLimit(identifier);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        error: 'Too many blog submissions. Please wait before trying again.',
      }, {
        status: 429,
        headers: {
          'Retry-After': (SUBMISSION_RATE_LIMIT_WINDOW / 1000).toString(),
          'X-RateLimit-Limit': SUBMISSION_RATE_LIMIT_MAX.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        },
      });
    }

    const payload = await request.json();
    const parsed = payloadSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    let status: BlogPostStatus = 'PENDING_APPROVAL';
    let publishedAt: Date | null = null;
    let submittedAt: Date | null = new Date();
    let approvedAt: Date | null = null;

    if (user.role === 'ADMIN') {
      status = 'PUBLISHED';
      publishedAt = new Date();
      approvedAt = new Date();
      submittedAt = null;
    }

    // Get or create AuthorProfile for the user (auto-creates if doesn't exist)
    const { id: authorProfileId } = await getOrCreateAuthorProfile(user.id);

    const slugBase =
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'post';
    let slug = slugBase;
    let counter = 1;

    while (await prisma.blogPost.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }

    const tagMap = new Map<string, string>();
    for (const rawTag of data.tags) {
      const trimmed = rawTag.trim();
      const sanitized = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (!sanitized) continue;
      if (!tagMap.has(sanitized)) {
        tagMap.set(sanitized, trimmed);
      }
    }

    const tagConnections = await Promise.all(
      Array.from(tagMap.entries()).map(async ([tagSlug, name]) => {
        const tag = await prisma.blogTag.upsert({
          where: { slug: tagSlug },
          update: { name },
          create: { name, slug: tagSlug },
        });

        return { tagId: tag.id };
      }),
    );

    // Calculate precise reading time and word count
    const readingTime = calculateReadingTime(data.content);
    
    // Calculate word count
    const textOnly = data.content
      .replace(/<[^>]*>/g, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]+`/g, ' ');
    const wordCount = textOnly.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    // Generate table of contents
    const tableOfContents = generateTableOfContents(data.content);

    const blogPost = await prisma.blogPost.create({
      data: {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        featuredImage: data.featuredImage,
        category: data.category,
        status,
        authorId: user.id,
        authorProfileId, // Link to AuthorProfile (auto-created if needed)
        slug,
        metaDescription: data.metaDescription,
        submittedAt,
        publishedAt,
        approvedAt,
        approvedBy: user.role === 'ADMIN' ? user.id : null, // Self-approved for admins
        readingTime,
        estimatedReadTime: readingTime,
        wordCount,
        tableOfContents: tableOfContents.length > 0 ? tableOfContents : undefined,
        images: [],
        tags: tagConnections.length
          ? {
              create: tagConnections,
            }
          : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
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
      },
    });

    // Update AuthorProfile stats
    await prisma.authorProfile.update({
      where: { id: authorProfileId },
      data: {
        totalPosts: { increment: 1 },
      },
    });

    if (status === 'PENDING_APPROVAL') {
      try {
        const adminUsers = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
        });

        await Promise.all(
          adminUsers.map((admin) =>
            createNotification({
              receiverId: admin.id,
              senderId: user.id,
              type: 'EMAIL',
              title: 'New Blog Submission Pending Approval',
              message: `Blog "${data.title}" was submitted by ${user.name} and is waiting for your review.`,
            }),
          ),
        );
      } catch (notificationError) {
        console.error('Failed to notify admins about blog submission', notificationError);
      }
    }

    return NextResponse.json({
      id: blogPost.id,
      status: blogPost.status,
      slug: blogPost.slug,
      readingTime: blogPost.readingTime,
      wordCount: blogPost.wordCount,
      tableOfContents: blogPost.tableOfContents,
      author: blogPost.author,
      authorProfile: blogPost.authorProfile,
      authorUrl: blogPost.authorProfile 
        ? `/author/${blogPost.authorProfile.username}` 
        : null,
      postUrl: blogPost.authorProfile 
        ? `/blog/${blogPost.authorProfile.username}/${blogPost.slug}`
        : `/blog/${blogPost.slug}`,
    }, {
      status: 201,
      headers: {
        'X-RateLimit-Limit': SUBMISSION_RATE_LIMIT_MAX.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error('External blog post error', error);
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 });
  }
}
