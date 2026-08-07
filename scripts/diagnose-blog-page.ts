/**
 * Diagnose /blog page data paths:
 *  1. Count published/approved posts (what browse mode shows).
 *  2. Simulate legacy GET /api/blog/posts (page=1, limit=10).
 *  3. Simulate v2 GET /api/blog/search (q=vaccination, categories=FARMING_TIPS).
 *  4. Check categories endpoint shape (slug === enum key).
 *
 * Usage:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/diagnose-blog-page.ts
 */

import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { SearchService } from '../lib/search-v2/SearchService';
import { ensureDefaultEngine } from '../lib/search-v2/registry';

async function main() {
  console.log('--- 1. Post counts by status ---');
  const byStatus = await prisma.blogPost.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  console.log(byStatus.map((r) => `${r.status}: ${r._count._all}`).join('\n'));

  const publicCount = await prisma.blogPost.count({
    where: { status: { in: ['PUBLISHED', 'APPROVED'] } },
  });
  console.log(`\nPublic-visible posts: ${publicCount}`);

  console.log('\n--- 2. Legacy /api/blog/posts simulation ---');
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: { in: ['PUBLISHED', 'APPROVED'] } },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            _count: { select: { followers: true, blogPosts: true } },
          },
        },
        authorProfile: {
          select: { id: true, displayName: true, username: true, avatarUrl: true, bio: true, isVerified: true },
        },
        tags: { include: { tag: true } },
        _count: {
          select: {
            comments: { where: { isApproved: true } },
            likedBy: true,
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip: 0,
      take: 10,
    });
    console.log(`Fetched ${posts.length} posts`);
    posts.slice(0, 3).forEach((p) => console.log(`  - [${p.category}] ${p.title.slice(0, 60)}`));
  } catch (err) {
    console.error('EXACT API QUERY FAILED:', (err as Error).message.slice(0, 500));
  }

  console.log('\n--- 3. v2 search simulation (q=vaccination) ---');
  try {
    ensureDefaultEngine();
    const envelope = await SearchService.search(new URLSearchParams({ q: 'vaccination', limit: '5' }));
    console.log(`mode=${envelope.mode} results=${envelope.results.length} total=${envelope.totalResults}`);
    envelope.results.slice(0, 2).forEach((r) => console.log(`  - ${r.title.slice(0, 60)} (author=${r.authorUsername})`));
  } catch (err) {
    console.error('v2 search failed:', (err as Error).message);
  }

  console.log('\n--- 4. Category keys sanity ---');
  const catCounts = await prisma.blogPost.groupBy({
    by: ['category'],
    where: { status: { in: ['PUBLISHED', 'APPROVED'] } },
    _count: { _all: true },
  });
  console.log(catCounts.map((r) => `${r.category}: ${r._count._all}`).join('\n'));

  await prisma.$disconnect();
  console.log('\nDONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
