/**
 * Migration Script: Link Existing Blog Posts to Author Profiles
 * 
 * This script:
 * 1. Finds all users who have blog posts but no author profile
 * 2. Creates author profiles for them automatically (if enabled)
 * 3. Links their existing blog posts to the author profile
 * 
 * Usage:
 *   npx tsx scripts/migrate-blog-authors.ts [--create-profiles] [--dry-run]
 * 
 * Options:
 *   --create-profiles: Automatically create author profiles for users without one
 *   --dry-run: Show what would happen without making changes
 */

import 'dotenv/config';
import { prisma } from '../lib/prisma';

interface MigrationResult {
  usersWithPosts: number;
  usersWithoutProfiles: number;
  profilesCreated: number;
  postsLinked: number;
  errors: string[];
}

async function generateUniqueUsername(baseName: string): Promise<string> {
  // Create URL-safe username from name
  let username = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 25);

  // Ensure minimum length
  if (username.length < 3) {
    username = `author_${username}`.substring(0, 25);
  }

  // Check for uniqueness
  let finalUsername = username;
  let counter = 1;
  
  while (await prisma.authorProfile.findUnique({ where: { username: finalUsername } })) {
    finalUsername = `${username.substring(0, 20)}_${counter}`;
    counter++;
  }

  return finalUsername;
}

async function migrateAuthors(options: { createProfiles: boolean; dryRun: boolean }): Promise<MigrationResult> {
  const result: MigrationResult = {
    usersWithPosts: 0,
    usersWithoutProfiles: 0,
    profilesCreated: 0,
    postsLinked: 0,
    errors: [],
  };

  console.log('\n📊 Starting Blog Author Migration...\n');
  console.log(`Options: ${options.dryRun ? '🔍 DRY RUN MODE' : '⚡ LIVE MODE'}`);
  console.log(`Create Profiles: ${options.createProfiles ? 'Yes' : 'No'}\n`);

  try {
    // Step 1: Find all users with blog posts
    const usersWithPosts = await prisma.user.findMany({
      where: {
        blogPosts: {
          some: {},
        },
      },
      include: {
        authorProfile: true,
        blogPosts: {
          select: {
            id: true,
            title: true,
            authorProfileId: true,
            status: true,
            publishedAt: true,
          },
        },
      },
    });

    result.usersWithPosts = usersWithPosts.length;
    console.log(`👤 Found ${usersWithPosts.length} users with blog posts\n`);

    // Step 2: Process each user
    for (const user of usersWithPosts) {
      console.log(`\n📝 Processing: ${user.name || user.email}`);
      console.log(`   Posts: ${user.blogPosts.length}`);

      // Check if user has an author profile
      if (!user.authorProfile) {
        result.usersWithoutProfiles++;
        console.log(`   ❌ No author profile found`);

        if (options.createProfiles) {
          // Create author profile
          try {
            const username = await generateUniqueUsername(user.name || user.email?.split('@')[0] || 'author');
            
            console.log(`   📌 Creating author profile with username: @${username}`);

            if (!options.dryRun) {
              const profile = await prisma.authorProfile.create({
                data: {
                  userId: user.id,
                  displayName: user.name || 'Anonymous Author',
                  username: username,
                  bio: `Author on our platform since ${new Date(user.createdAt).toLocaleDateString()}`,
                  avatarUrl: user.avatar,
                  isPublic: true,
                  isVerified: false,
                  totalPosts: user.blogPosts.filter(p => p.status === 'PUBLISHED').length,
                },
              });

              result.profilesCreated++;
              console.log(`   ✅ Created author profile: ${profile.id}`);

              // Link all posts to the new profile
              const postsToLink = user.blogPosts.filter(p => !p.authorProfileId);
              if (postsToLink.length > 0) {
                await prisma.blogPost.updateMany({
                  where: {
                    id: { in: postsToLink.map(p => p.id) },
                  },
                  data: {
                    authorProfileId: profile.id,
                  },
                });
                result.postsLinked += postsToLink.length;
                console.log(`   🔗 Linked ${postsToLink.length} posts to profile`);
              }
            } else {
              console.log(`   [DRY RUN] Would create profile and link ${user.blogPosts.length} posts`);
            }
          } catch (error: any) {
            const errorMsg = `Failed to create profile for user ${user.id}: ${error.message}`;
            result.errors.push(errorMsg);
            console.log(`   ⚠️  ${errorMsg}`);
          }
        } else {
          console.log(`   ⏭️  Skipping profile creation (--create-profiles not set)`);
        }
      } else {
        console.log(`   ✅ Has author profile: @${user.authorProfile.username}`);

        // Link any unlinked posts to the existing profile
        const unlinkedPosts = user.blogPosts.filter(p => !p.authorProfileId);
        
        if (unlinkedPosts.length > 0) {
          console.log(`   📝 Found ${unlinkedPosts.length} posts without profile link`);

          if (!options.dryRun) {
            await prisma.blogPost.updateMany({
              where: {
                id: { in: unlinkedPosts.map(p => p.id) },
              },
              data: {
                authorProfileId: user.authorProfile.id,
              },
            });
            result.postsLinked += unlinkedPosts.length;
            console.log(`   🔗 Linked ${unlinkedPosts.length} posts to existing profile`);
          } else {
            console.log(`   [DRY RUN] Would link ${unlinkedPosts.length} posts`);
          }
        } else {
          console.log(`   ✅ All posts already linked to profile`);
        }
      }
    }

    // Step 3: Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total users with posts:    ${result.usersWithPosts}`);
    console.log(`Users without profiles:    ${result.usersWithoutProfiles}`);
    console.log(`Profiles created:          ${result.profilesCreated}`);
    console.log(`Posts linked to profiles:  ${result.postsLinked}`);
    console.log(`Errors:                    ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach(e => console.log(`   - ${e}`));
    }

    if (options.dryRun) {
      console.log('\n🔍 This was a DRY RUN. No changes were made.');
      console.log('   Run without --dry-run to apply changes.');
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    result.errors.push(error.message);
  }

  return result;
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  createProfiles: args.includes('--create-profiles'),
  dryRun: args.includes('--dry-run'),
};

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Blog Author Migration Script
============================

Usage:
  npx ts-node scripts/migrate-blog-authors.ts [options]

Options:
  --create-profiles  Create author profiles for users who don't have one
  --dry-run          Preview changes without applying them
  --help, -h         Show this help message

Examples:
  # Preview what would happen
  npx ts-node scripts/migrate-blog-authors.ts --dry-run

  # Link existing posts to profiles (don't create new profiles)
  npx ts-node scripts/migrate-blog-authors.ts

  # Link posts AND create profiles for users without one
  npx ts-node scripts/migrate-blog-authors.ts --create-profiles

  # Preview profile creation
  npx ts-node scripts/migrate-blog-authors.ts --create-profiles --dry-run
`);
  process.exit(0);
}

// Run migration
migrateAuthors(options)
  .then(() => {
    console.log('\n✨ Migration complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
