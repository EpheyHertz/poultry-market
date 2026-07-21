import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/customer/',
          '/seller/',
          '/delivery-agent/',
          '/stakeholder/',
          '/auth/',
          '/my-blogs/',
          '/author/dashboard',
          '/author/posts',
          '/author/profile',
          '/author/support/',
          '/order/',
          '/chats/',
          '/farm/',
          '/company/',
          '/storefront/',
          '/support/',
          '/accept-invitation',
          '/_next/',
          '/private/',
          '/*.json$',
          '/search?*',
          '/blog/submit',
          '/blog/edit/',
        ],
      },
      // Block known AI scrapers from bulk crawling (optional, defensive)
      {
        userAgent: 'GPTBot',
        disallow: ['/admin/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
