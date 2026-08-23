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
import {
  normalizeAuthorExpertise,
  normalizeAuthorSocialInput,
  normalizeAuthorText,
  normalizeAuthorWebsiteInput,
  type ValidationResult,
} from '@/lib/author-profile';

/**
 * Author-supplied profile fields, validated in one place (author-spec §33).
 *
 * Nothing reaches Prisma untouched: free text is length-capped and stripped of
 * angle brackets, the website must be an absolute http(s) URL, and each social
 * value must be either a plain handle or a safe http(s) link. `javascript:` and
 * `data:` URLs are rejected outright rather than silently stored.
 */
const SOCIAL_FIELDS = [
  { key: 'twitter', column: 'twitterHandle', label: 'X (Twitter)' },
  { key: 'linkedin', column: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'github', column: 'githubUsername', label: 'GitHub' },
  { key: 'facebook', column: 'facebookUrl', label: 'Facebook' },
  { key: 'instagram', column: 'instagramHandle', label: 'Instagram' },
  { key: 'youtube', column: 'youtubeChannel', label: 'YouTube' },
] as const;

const TEXT_FIELDS = [
  { key: 'bio', column: 'bio', label: 'Bio', max: 2000 },
  { key: 'tagline', column: 'tagline', label: 'Professional title', max: 120 },
  { key: 'location', column: 'location', label: 'Location', max: 120 },
  { key: 'occupation', column: 'occupation', label: 'Occupation', max: 120 },
  { key: 'company', column: 'company', label: 'Organisation', max: 120 },
] as const;

/** Throwable-free helper: returns the first validation error, if any. */
function firstError(results: Array<ValidationResult<unknown>>): string | null {
  for (const result of results) {
    if (!result.ok) return result.error;
  }
  return null;
}

/**
 * Re-shapes the stored social columns into the `socialLinks` object the author
 * dashboard edits, so the form round-trips through the same keys it submits
 * (author-spec §34 — one source of truth, no parallel author data shapes).
 */
function toSocialLinks(profile: Record<string, unknown>) {
  const socialLinks: Record<string, string> = {};

  for (const field of SOCIAL_FIELDS) {
    const value = profile[field.column];
    if (typeof value === 'string' && value.trim().length > 0) {
      socialLinks[field.key] = value;
    }
  }

  return socialLinks;
}


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

    return NextResponse.json({
      profile: profile ? { ...profile, socialLinks: toSocialLinks(profile) } : null,
    });
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
    const { displayName, username, avatarUrl, website, expertise, socialLinks } = body;

    // Validate display name
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Display name must be at least 2 characters' },
        { status: 400 }
      );
    }
    if (displayName.trim().length > 80) {
      return NextResponse.json(
        { error: 'Display name must be 80 characters or fewer' },
        { status: 400 }
      );
    }

    // Validate every author-controlled field before it is persisted (§33).
    const textValues: Record<string, string | null> = {};
    for (const field of TEXT_FIELDS) {
      const result = normalizeAuthorText(body[field.key], field.label, field.max);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      textValues[field.column] = result.value;
    }

    const websiteResult = normalizeAuthorWebsiteInput(website);
    if (!websiteResult.ok) {
      return NextResponse.json({ error: websiteResult.error }, { status: 400 });
    }

    const expertiseResult = normalizeAuthorExpertise(expertise);
    if (!expertiseResult.ok) {
      return NextResponse.json({ error: expertiseResult.error }, { status: 400 });
    }

    const socialValues: Record<string, string | null> = {};
    for (const field of SOCIAL_FIELDS) {
      const result = normalizeAuthorSocialInput(socialLinks?.[field.key], field.label);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      socialValues[field.column] = result.value;
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
    const avatarResult = normalizeAuthorWebsiteInput(avatarUrl);
    if (!avatarResult.ok) {
      return NextResponse.json({ error: 'Profile photo must be a valid http(s) URL' }, { status: 400 });
    }

    let finalAvatarUrl = avatarResult.value;
    if (!finalAvatarUrl) {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { avatar: true }
      });
      finalAvatarUrl = userData?.avatar || null;
    }

    // Create profile from the validated values only.
    const profile = await prisma.authorProfile.create({
      data: {
        userId: user.id,
        displayName: displayName.trim(),
        username: finalUsername,
        avatarUrl: finalAvatarUrl,
        website: websiteResult.value,
        expertise: expertiseResult.value,
        ...textValues,
        ...socialValues,
        isPublic: true,
        // Verification is never self-granted — it stays false until the platform
        // grants it through a real mechanism (§19).
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
      avatarUrl,
      website,
      expertise,
      socialLinks,
      isPublic,
      allowComments,
      showEmail,
      emailOnComment,
      emailOnFollow
    } = body;

    // Validate display name if provided
    if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim().length < 2)) {
      return NextResponse.json(
        { error: 'Display name must be at least 2 characters' },
        { status: 400 }
      );
    }
    if (typeof displayName === 'string' && displayName.trim().length > 80) {
      return NextResponse.json(
        { error: 'Display name must be 80 characters or fewer' },
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

    // Build update data — every author-controlled value is validated first (§33).
    const updateData: any = {};

    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (username !== undefined) updateData.username = finalUsername;
    if (avatarUrl !== undefined) {
      // Avatars are uploaded through the existing image pipeline, but the stored
      // value is still re-checked so only http(s) URLs can be rendered.
      const avatar = normalizeAuthorWebsiteInput(avatarUrl);
      if (!avatar.ok) {
        return NextResponse.json({ error: 'Profile photo must be a valid http(s) URL' }, { status: 400 });
      }
      updateData.avatarUrl = avatar.value;
    }

    // Free-text fields: bio, professional title (tagline), location, occupation, company.
    for (const field of TEXT_FIELDS) {
      const raw = body[field.key];
      if (raw === undefined) continue;

      const result = normalizeAuthorText(raw, field.label, field.max);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      updateData[field.column] = result.value;
    }

    if (website !== undefined) {
      const result = normalizeAuthorWebsiteInput(website);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      updateData.website = result.value;
    }

    // Areas of expertise (§11) — clean tags, capped and de-duplicated.
    if (expertise !== undefined) {
      const result = normalizeAuthorExpertise(expertise);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      updateData.expertise = result.value;
    }

    // Social links (§4, §5) — handles or safe http(s) links only.
    if (socialLinks !== undefined && socialLinks !== null) {
      if (typeof socialLinks !== 'object') {
        return NextResponse.json({ error: 'Social links must be an object' }, { status: 400 });
      }

      const results = SOCIAL_FIELDS.map((field) => ({
        field,
        result: socialLinks[field.key] === undefined
          ? null
          : normalizeAuthorSocialInput(socialLinks[field.key], field.label),
      }));

      const error = firstError(results.map((r) => r.result).filter(Boolean) as Array<ValidationResult<unknown>>);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }

      for (const { field, result } of results) {
        if (result?.ok) updateData[field.column] = result.value;
      }
    }

    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    if (allowComments !== undefined) updateData.allowComments = Boolean(allowComments);
    // §3 — the author's explicit opt-in for showing a public contact email.
    if (showEmail !== undefined) updateData.showEmail = Boolean(showEmail);
    if (emailOnComment !== undefined) updateData.emailOnComment = Boolean(emailOnComment);
    if (emailOnFollow !== undefined) updateData.emailOnFollow = Boolean(emailOnFollow);


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
