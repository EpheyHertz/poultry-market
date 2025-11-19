import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWeeklyBlogAnalyticsDigest } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { authorId, postId } = await request.json()

    if (!authorId && !postId) {
      return NextResponse.json(
        { error: 'authorId or postId is required' },
        { status: 400 }
      )
    }

    let author: { id: string; name: string | null; email: string | null } | null = null

    if (authorId) {
      author = await prisma.user.findUnique({
        where: { id: authorId },
        select: { id: true, name: true, email: true },
      })
    } else if (postId) {
      const post = await prisma.blogPost.findUnique({
        where: { id: postId },
        select: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      })
      author = post?.author || null
    }

    if (!author || !author.email) {
      return NextResponse.json(
        { error: 'Unable to resolve blog author email' },
        { status: 404 }
      )
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const authorPosts = await prisma.blogPost.findMany({
      where: { authorId: author.id },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        readingTime: true,
        viewCount: true,
        likes: true,
        views: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    })

    const totalViews = authorPosts.reduce(
      (total, post) => total + (post.viewCount ?? post.views ?? 0),
      0
    )
    const totalLikes = authorPosts.reduce(
      (total, post) => total + (post.likes ?? 0),
      0
    )
    const totalComments = authorPosts.reduce(
      (total, post) => total + (post._count.comments ?? 0),
      0
    )
    const avgReadingTime = authorPosts.length
      ? Math.round(
          authorPosts.reduce((sum, post) => sum + (post.readingTime || 0), 0) /
            authorPosts.length
        )
      : null

    const publishedPosts = authorPosts.filter((post) => post.status === 'PUBLISHED')
    const postsPublishedThisWeek = publishedPosts.filter((post) => {
      const referenceDate = post.publishedAt ?? post.createdAt
      return referenceDate >= sevenDaysAgo
    }).length

    const commentsThisWeek = await prisma.blogComment.count({
      where: {
        post: { authorId: author.id },
        createdAt: { gte: sevenDaysAgo },
      },
    })

    const score = (post: (typeof authorPosts)[number]) => {
      const views = post.viewCount ?? post.views ?? 0
      const likes = post.likes ?? 0
      const comments = post._count.comments ?? 0
      return views * 0.6 + likes * 0.3 + comments * 0.1
    }

    const topPosts = [...authorPosts]
      .sort((a, b) => score(b) - score(a))
      .slice(0, 3)
      .map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        views: post.viewCount ?? post.views ?? 0,
        likes: post.likes ?? 0,
        comments: post._count.comments ?? 0,
        publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
      }))

    await sendWeeklyBlogAnalyticsDigest({
      author,
      stats: {
        totalPosts: authorPosts.length,
        publishedPosts: publishedPosts.length,
        postsPublishedThisWeek,
        totalViews,
        totalLikes,
        totalComments,
        commentsThisWeek,
        avgReadingTime,
      },
      timeframe: {
        label: 'Past 7 days',
        start: sevenDaysAgo.toISOString(),
        end: now.toISOString(),
      },
      topPosts,
    })

    return NextResponse.json({
      message: `Sent analytics digest to ${author.name || 'blog author'}`,
    })
  } catch (error) {
    console.error('Error sending weekly analytics email:', error)
    return NextResponse.json(
      { error: 'Failed to send weekly analytics email' },
      { status: 500 }
    )
  }
}
