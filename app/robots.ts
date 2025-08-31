import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://poultrymarketke.vercel.app'
  
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
          '/auth/reset-password/',
          '/auth/verify-email/',
          '/_next/',
          '/private/',
          '/*.json$',
          '/search?*',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/products/',
          '/categories/',
          '/store/',
          '/chatbot/',
          '/announcements/',
          '/contact/',
          '/terms/',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/customer/',
          '/seller/',
          '/delivery-agent/',
          '/stakeholder/',
          '/auth/reset-password/',
          '/auth/verify-email/',
        ],
      },
      {
        userAgent: 'bingbot',
        allow: [
          '/',
          '/products/',
          '/categories/',
          '/store/',
          '/chatbot/',
          '/announcements/',
          '/contact/',
          '/terms/',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/customer/',
          '/seller/',
          '/delivery-agent/',
          '/stakeholder/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
