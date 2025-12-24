import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { 
  validateUsername, 
  isUsernameAvailable, 
  generateUniqueUsername,
  updateAuthorStats,
  linkExistingPostsToProfile
} from '@/lib/author';

// GET - Get current user's author profile
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const profile = await prisma.authorProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
            _count: {
              select: {
                followers: true,
                following: true,
                blogPosts: true
              }
            }
          }
        },
        _count: {
          select: {
            blogPosts: true
          }
        }
      }
    });
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching author profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// POST - Create author profile
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if profile already exists
    const existing = await prisma.authorProfile.findUnique({
      where: { userId: user.id }
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Author profile already exists' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { displayName, username, bio, avatarUrl, website, location, occupation, company, socialLinks } = body;
    
    // Validate display name
    if (!displayName || displayName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Display name must be at least 2 characters' },
        { status: 400 }
      );
    }
    
    // Handle username
    let finalUsername: string;
    
    if (username) {
      // Validate provided username
      const validation = validateUsername(username);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      
      // Check availability
      const available = await isUsernameAvailable(username);
      if (!available) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        );
      }
      
      finalUsername = username.toLowerCase();
    } else {
      // Generate username from display name
      finalUsername = await generateUniqueUsername(displayName);
    }
    
    // Get user's avatar as default if no avatarUrl provided
    let finalAvatarUrl = avatarUrl || null;
    if (!finalAvatarUrl) {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { avatar: true }
      });
      finalAvatarUrl = userData?.avatar || null;
    }
    
    // Create profile
    const profile = await prisma.authorProfile.create({
      data: {
        userId: user.id,
        displayName: displayName.trim(),
        username: finalUsername,
        bio: bio?.trim() || null,
        avatarUrl: finalAvatarUrl,
        website: website?.trim() || null,
        location: location?.trim() || null,
        occupation: occupation?.trim() || null,
        company: company?.trim() || null,
        twitterHandle: socialLinks?.twitter || null,
        linkedinUrl: socialLinks?.linkedin || null,
        githubUsername: socialLinks?.github || null,
        facebookUrl: socialLinks?.facebook || null,
        instagramHandle: socialLinks?.instagram || null,
        youtubeChannel: socialLinks?.youtube || null,
        isPublic: true,
        isVerified: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });
    
    // Link any existing blog posts by this user to the new profile
    const linkedPostsCount = await linkExistingPostsToProfile(user.id, profile.id);
    
    return NextResponse.json({ 
      profile,
      linkedPosts: linkedPostsCount,
      message: linkedPostsCount > 0 
        ? `Author profile created successfully. ${linkedPostsCount} existing post(s) have been linked to your profile.`
        : 'Author profile created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating author profile:', error);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}

// PATCH - Update author profile
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const existing = await prisma.authorProfile.findUnique({
      where: { userId: user.id }
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Author profile not found. Please create one first.' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { 
      displayName, 
      username, 
      bio, 
      avatarUrl,
      website, 
      location, 
      occupation, 
      company, 
      socialLinks,
      isPublic,
      allowComments,
      emailOnComment,
      emailOnFollow
    } = body;
    
    // Validate display name if provided
    if (displayName !== undefined && displayName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Display name must be at least 2 characters' },
        { status: 400 }
      );
    }
    
    // Handle username change
    let finalUsername = existing.username;
    
    if (username && username !== existing.username) {
      const validation = validateUsername(username);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      
      const available = await isUsernameAvailable(username, user.id);
      if (!available) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        );
      }
      
      finalUsername = username.toLowerCase();
    }
    
    // Build update data
    const updateData: any = {};
    
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (username !== undefined) updateData.username = finalUsername;
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (occupation !== undefined) updateData.occupation = occupation?.trim() || null;
    if (company !== undefined) updateData.company = company?.trim() || null;
    if (socialLinks !== undefined) {
      if (socialLinks.twitter !== undefined) updateData.twitterHandle = socialLinks.twitter || null;
      if (socialLinks.linkedin !== undefined) updateData.linkedinUrl = socialLinks.linkedin || null;
      if (socialLinks.github !== undefined) updateData.githubUsername = socialLinks.github || null;
      if (socialLinks.facebook !== undefined) updateData.facebookUrl = socialLinks.facebook || null;
      if (socialLinks.instagram !== undefined) updateData.instagramHandle = socialLinks.instagram || null;
      if (socialLinks.youtube !== undefined) updateData.youtubeChannel = socialLinks.youtube || null;
    }
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (allowComments !== undefined) updateData.allowComments = allowComments;
    if (emailOnComment !== undefined) updateData.emailOnComment = emailOnComment;
    if (emailOnFollow !== undefined) updateData.emailOnFollow = emailOnFollow;
    
    const profile = await prisma.authorProfile.update({
      where: { userId: user.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });
    
    return NextResponse.json({ 
      profile,
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Error updating author profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
