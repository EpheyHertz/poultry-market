import { SITE_URL } from '@/lib/seo';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED', publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      publishedAt: true,
      updatedAt: true,
      author: { select: { name: true } },
      authorProfile: { select: { username: true } },
    },
  });

  const items = posts.map((post) => {
    const authorPath =
      post.authorProfile?.username ||
      post.author.name.toLowerCase().replace(/\s+/g, '-');
    const postUrl = `${SITE_URL}/blog/${authorPath}/${post.slug}`;
    const pubDate = new Date(post.publishedAt ?? Date.now()).toUTCString();
    const updatedDate = new Date(post.updatedAt ?? post.publishedAt ?? Date.now()).toUTCString();

    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:date>${updatedDate}</dc:date>
      <author>${escapeXml(post.author.name)}</author>
      ${post.excerpt ? `<description>${escapeXml(post.excerpt)}</description>` : ''}
    </item>`;
  });

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Poultry Market Kenya — Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Expert poultry farming articles, tips, and news from Kenya&apos;s largest digital poultry platform.</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${items.join('\n')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
