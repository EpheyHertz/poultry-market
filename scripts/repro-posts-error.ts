/** Reproduce the posts query and dump the FULL Prisma error + generated SQL. */

import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  try {
    await prisma.blogPost.findMany({
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
    console.log('QUERY SUCCEEDED');
  } catch (err: any) {
    console.log('=== ERROR NAME:', err?.name);
    console.log('=== ERROR CODE:', err?.code);
    console.log('=== META:', JSON.stringify(err?.meta, null, 2));
    console.log('=== FULL MESSAGE ===');
    console.log(err?.message);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
