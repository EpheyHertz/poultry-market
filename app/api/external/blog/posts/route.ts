import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey } from '@/lib/api-keys';
import { createNotification } from '@/lib/notifications';
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

    if (user.role === 'ADMIN') {
      status = 'PUBLISHED';
      publishedAt = new Date();
      submittedAt = null;
    }

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

    const blogPost = await prisma.blogPost.create({
      data: {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        featuredImage: data.featuredImage,
        category: data.category,
        status,
        authorId: user.id,
        slug,
        metaDescription: data.metaDescription,
        submittedAt,
        publishedAt,
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
      author: blogPost.author,
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
