import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First try to find by user ID
    const author = await prisma.user.findUnique({
      where: { id },
      include: {
        authorProfile: true,
        blogPosts: {
          where: {
            status: {
              in: ['PUBLISHED', 'APPROVED']
            }
          },
          include: {
            tags: true,
            authorProfile: {
              select: {
                displayName: true,
                username: true,
                avatarUrl: true
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
        },
        _count: {
          select: {
            blogPosts: {
              where: {
                status: {
                  in: ['PUBLISHED', 'APPROVED']
                }
              }
            },
            followers: true,
            following: true
          }
        }
      }
    });

    if (!author) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 404 }
      );
    }

    // Use AuthorProfile data if available, fallback to User data
    const profile = author.authorProfile;
    
    // Transform response to use AuthorProfile data preferentially
    const response = {
      // Core identity
      id: author.id,
      authorProfileId: profile?.id || null,
      
      // Display info - prefer AuthorProfile
      name: profile?.displayName || author.name,
      displayName: profile?.displayName || author.name,
      username: profile?.username || null,
      avatar: profile?.avatarUrl || author.avatar,
      avatarUrl: profile?.avatarUrl || author.avatar,
      coverImageUrl: profile?.coverImageUrl || null,
      bio: profile?.bio || author.bio || null,
      tagline: profile?.tagline || null,
      
      // Contact & social
      location: profile?.location || author.location || null,
      website: profile?.website || author.website || null,
      // Social links as individual fields from profile
      socialLinks: profile ? {
        twitter: profile.twitterHandle,
        linkedin: profile.linkedinUrl,
        github: profile.githubUsername,
        facebook: profile.facebookUrl,
        instagram: profile.instagramHandle,
        youtube: profile.youtubeChannel
      } : null,
      
      // Profile settings
      isVerified: profile?.isVerified || false,
      isPublic: profile?.isPublic ?? true,
      
      // Stats
      totalPosts: profile?.totalPosts || author._count.blogPosts,
      totalViews: profile?.totalViews || 0,
      totalLikes: profile?.totalLikes || 0,
      
      // Legacy fields
      role: author.role,
      createdAt: author.createdAt,
      
      // Counts
      _count: author._count,
      
      // Blog posts with author profile data
      blogPosts: author.blogPosts.map(post => ({
        ...post,
        // Override author display data from profile
        authorDisplayName: post.authorProfile?.displayName || profile?.displayName || author.name,
        authorUsername: post.authorProfile?.username || profile?.username || null,
        authorAvatarUrl: post.authorProfile?.avatarUrl || profile?.avatarUrl || author.avatar
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching author:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}