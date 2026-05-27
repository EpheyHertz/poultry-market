import { MetadataRoute } from 'next';
import { seoConfig } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = seoConfig.siteUrl;

  return {
    rules: {
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
        '/order/',
        '/_next/',
        '/private/',
        '/*.json$',
        '/search?*',
      ],
    },
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/blog/sitemap.xml`,
    ],
    host: baseUrl,
  };
}
