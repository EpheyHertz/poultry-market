/**
 * Diff live table columns against what Prisma Client expects.
 * Prints information_schema columns for the tables touched by
 * GET /api/blog/posts (blog_posts, users, author_profiles,
 * blog_post_tags, blog_tags, comments, likes).
 */

import 'dotenv/config';
import { prisma } from '../lib/prisma';

const TABLES = [
  'blog_posts',
  'users',
  'author_profiles',
  'blog_post_tags',
  'blog_tags',
  'blog_comments',
  'blog_post_likes',
];

async function main() {
  for (const table of TABLES) {
    const cols = (await prisma.$queryRawUnsafe(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      table
    )) as Array<{ column_name: string; data_type: string; is_nullable: string }>;
    console.log(`\n=== ${table} (${cols.length} cols) ===`);
    console.log(cols.map((c) => c.column_name).join(', '));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
