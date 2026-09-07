/**
 * Diagnoses / verifies author balance on the public blog listing.
 *
 * Run:
 *   npx ts-node -r ./scripts/alias-register.js --compiler-options "{\"module\":\"CommonJS\"}" scripts/diagnose-author-balance.ts
 */

import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { getBlogPosts } from '../lib/blog/get-posts';
import { BLOG_PAGE_SIZE, FEATURED_LIMIT } from '../lib/blog/listing-config';

const PUBLIC = { status: { in: ['PUBLISHED', 'APPROVED'] as any } };

function pad(value: string, width: number) {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

async function authorNames(ids: string[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return new Map(users.map((u) => [u.id, u.name ?? u.id]));
}

async function main() {
  console.log('=== 1. Public posts per author ===');
  const grouped = await prisma.blogPost.groupBy({
    by: ['authorId'],
    where: PUBLIC,
    _count: { _all: true },
  });
  const names = await authorNames(grouped.map((g) => g.authorId));
  grouped
    .sort((a, b) => b._count._all - a._count._all)
    .forEach((g) => {
      console.log(`  ${pad(names.get(g.authorId) ?? g.authorId, 30)} ${g._count._all}`);
    });
  const totalPublic = grouped.reduce((sum, g) => sum + g._count._all, 0);
  console.log(`  TOTAL: ${totalPublic}`);

  console.log('\n=== 2. Featured carousel composition ===');
  const featured = await getBlogPosts({ page: 1, featured: true, limit: FEATURED_LIMIT });
  const featuredCounts = new Map<string, number>();
  featured.posts.forEach((p) => {
    const name = p.authorDisplayName;
    featuredCounts.set(name, (featuredCounts.get(name) ?? 0) + 1);
  });
  featured.posts.forEach((p, i) => {
    console.log(`  ${pad(String(i + 1), 3)} ${p.authorDisplayName}`);
  });
  console.log(`  Distinct authors in carousel: ${featuredCounts.size}`);

  console.log('\n=== 3. "All Articles" page 1 ===');
  const page1 = await getBlogPosts({ page: 1, limit: BLOG_PAGE_SIZE });
  page1.posts.forEach((p, i) => {
    const flag = p.featured ? '[F]' : '   ';
    const date = (p.publishedAt ?? p.createdAt).toISOString().slice(0, 10);
    console.log(`  ${pad(String(i + 1), 3)} ${flag} ${pad(p.authorDisplayName, 26)} ${date}`);
  });
  const page1Authors = new Set(page1.posts.map((p) => p.authorDisplayName));
  console.log(`  Distinct authors on page 1: ${page1Authors.size}`);
  console.log(
    `  Pagination: ${page1.pagination.totalPosts} posts / ${page1.pagination.totalPages} pages`
  );

  console.log('\n=== 4. Pagination integrity across every page ===');
  const seen = new Map<string, number>();
  let duplicates = 0;
  let emptyPages = 0;
  const perPageAuthorCounts: number[] = [];

  for (let page = 1; page <= page1.pagination.totalPages; page++) {
    const result = await getBlogPosts({ page, limit: BLOG_PAGE_SIZE });
    if (result.posts.length === 0) emptyPages++;
    perPageAuthorCounts.push(new Set(result.posts.map((p) => p.author.id)).size);
    for (const post of result.posts) {
      if (seen.has(post.id)) {
        duplicates++;
        console.log(`  DUPLICATE ${post.slug} on pages ${seen.get(post.id)} and ${page}`);
      } else {
        seen.set(post.id, page);
      }
    }
  }

  console.log(`  Pages walked:        ${page1.pagination.totalPages}`);
  console.log(`  Unique posts seen:   ${seen.size} (expected ${totalPublic})`);
  console.log(`  Duplicates:          ${duplicates}`);
  console.log(`  Empty pages:         ${emptyPages}`);
  console.log(`  Missing posts:       ${totalPublic - seen.size}`);
  console.log(
    `  Distinct authors/page: min ${Math.min(...perPageAuthorCounts)}, max ${Math.max(
      ...perPageAuthorCounts
    )}`
  );

  const ok =
    duplicates === 0 && seen.size === totalPublic && page1Authors.size > 1;
  console.log(`\n${ok ? 'PASS' : 'FAIL'} - author balance + pagination integrity`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
