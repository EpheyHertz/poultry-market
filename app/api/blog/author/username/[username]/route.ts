import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET author profile by username
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Find author profile by username
    const authorProfile = await prisma.authorProfile.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            _count: {
              select: {
                followers: true,
                following: true
              }
            }
          }
        },
        blogPosts: {
          where: {
            status: {
              in: ['PUBLISHED', 'APPROVED']
            }
          },
          include: {
            tags: {
              include: {
                tag: true
              }
            },
            _count: {
              select: {
                likedBy: true,
                comments: true
              }
            }
          },
          orderBy: {
            publishedAt: 'desc'
          }
        }
      }
    });

    if (!authorProfile) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 404 }
      );
    }

    // Transform the response to be consistent with existing author API
    const response = {
      // Author Profile fields (preferred for public display)
      id: authorProfile.user.id,
      authorProfileId: authorProfile.id,
      displayName: authorProfile.displayName,
      username: authorProfile.username,
      bio: authorProfile.bio,
      avatarUrl: authorProfile.avatarUrl,
      coverImageUrl: authorProfile.coverImageUrl,
      tagline: authorProfile.tagline,
      website: authorProfile.website,
      location: authorProfile.location,
      // Social links as individual fields
      socialLinks: {
        twitter: authorProfile.twitterHandle,
        linkedin: authorProfile.linkedinUrl,
        github: authorProfile.githubUsername,
        facebook: authorProfile.facebookUrl,
        instagram: authorProfile.instagramHandle,
        youtube: authorProfile.youtubeChannel
      },
      isVerified: authorProfile.isVerified,
      isPublic: authorProfile.isPublic,
      
      // Stats from author profile
      totalPosts: authorProfile.totalPosts,
      totalViews: authorProfile.totalViews,
      totalLikes: authorProfile.totalLikes,
      
      // Legacy fields for backward compatibility (from User)
      name: authorProfile.displayName, // Use displayName as name
      avatar: authorProfile.avatarUrl, // Use avatarUrl as avatar
      email: authorProfile.user.email, // Keep for internal use only
      createdAt: authorProfile.user.createdAt,
      
      // Counts (combine profile and user data)
      _count: {
        blogPosts: authorProfile.blogPosts.length,
        followers: authorProfile.user._count.followers,
        following: authorProfile.user._count.following
      },
      
      // Blog posts with transformed author data
      blogPosts: authorProfile.blogPosts.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        featuredImage: post.featuredImage,
        category: post.category,
        featured: post.featured,
        viewCount: post.viewCount,
        readingTime: post.readingTime,
        publishedAt: post.publishedAt,
        tags: post.tags.map(t => ({
          id: t.tag.id,
          name: t.tag.name,
          slug: t.tag.slug
        })),
        _count: post._count,
        // Author info from profile
        authorUsername: authorProfile.username,
        authorDisplayName: authorProfile.displayName
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching author by username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
