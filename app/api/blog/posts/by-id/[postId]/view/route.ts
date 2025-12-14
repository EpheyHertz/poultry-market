import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// POST - Track a view for a blog post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    
    // Get the post
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      select: { id: true, status: true }
    });
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Only track views for published posts
    if (post.status !== 'PUBLISHED') {
      return NextResponse.json({ tracked: false, reason: 'Post not published' });
    }
    
    const user = await getCurrentUser();
    const body = await request.json().catch(() => ({}));
    const { readDuration, scrollDepth, referrer } = body;
    
    // Get or create session ID for anonymous users
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('view_session')?.value;
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      // Note: Cookie will be set client-side or via middleware
    }
    
    // Hash IP for privacy
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip + process.env.JWT_SECRET).digest('hex').substring(0, 16);
    
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Determine device type from user agent
    const deviceType = userAgent?.toLowerCase().includes('mobile') 
      ? 'mobile' 
      : userAgent?.toLowerCase().includes('tablet') 
        ? 'tablet' 
        : 'desktop';
    
    // Check for existing view (deduplicate)
    let existingView: any = null;
    
    if (user?.id) {
      existingView = await prisma.blogPostView.findFirst({
        where: {
          postId,
          userId: user.id
        }
      });
    } else if (sessionId) {
      existingView = await prisma.blogPostView.findFirst({
        where: {
          postId,
          sessionId
        }
      });
    }
    
    if (existingView) {
      // Update existing view with new engagement data
      await prisma.blogPostView.update({
        where: { id: existingView.id },
        data: {
          readDuration: readDuration ? Math.max(existingView.readDuration || 0, readDuration) : existingView.readDuration,
          scrollDepth: scrollDepth ? Math.max(existingView.scrollDepth || 0, scrollDepth) : existingView.scrollDepth,
          completedRead: scrollDepth && scrollDepth >= 80 ? true : existingView.completedRead
        }
      });
      
      return NextResponse.json({ 
        tracked: true, 
        type: 'updated',
        sessionId 
      });
    }
    
    // Create new view record
    await prisma.blogPostView.create({
      data: {
        postId,
        userId: user?.id || null,
        sessionId: user?.id ? null : sessionId,
        ipHash,
        readDuration: readDuration || null,
        scrollDepth: scrollDepth || null,
        referrer: referrer || null,
        deviceType,
        completedRead: scrollDepth && scrollDepth >= 80 ? true : false
      }
    });
    
    // Increment view counts on the post
    await prisma.blogPost.update({
      where: { id: postId },
      data: {
        viewCount: { increment: 1 },
        views: { increment: 1 },
        uniqueViewCount: { increment: 1 }
      }
    });
    
    // Update author profile stats if linked
    const postWithAuthor = await prisma.blogPost.findUnique({
      where: { id: postId },
      select: { authorProfileId: true }
    });
    
    if (postWithAuthor?.authorProfileId) {
      await prisma.authorProfile.update({
        where: { id: postWithAuthor.authorProfileId },
        data: {
          totalViews: { increment: 1 }
        }
      });
    }
    
    return NextResponse.json({ 
      tracked: true, 
      type: 'new',
      sessionId 
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    // Don't fail the request for tracking errors
    return NextResponse.json({ tracked: false, error: 'Tracking failed' });
  }
}
