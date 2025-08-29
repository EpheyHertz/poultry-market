import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Static routes that should be included in sitemap
const staticRoutes = [
  '',
  '/products',
  '/categories',
  '/announcements',
  '/auth/register',
  '/auth/login',
  '/contact',
  '/terms',
  '/about',
];

// Dynamic route generators
const getDynamicRoutes = async () => {
  try {
    // Get all products
    const products = await prisma.product.findMany({
      where: { 
        isActive: true,
        seller: {
          isVerified: true
        }
      },
      select: { 
        slug: true, 
        id: true, 
        updatedAt: true 
      },
      take: 1000 // Limit to prevent huge sitemaps
    });

    // Get all categories
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { 
        name: true,
        slug: true, 
        updatedAt: true 
      }
    });

    // Get all verified sellers (acting as stores)
    const sellers = await prisma.user.findMany({
      where: { 
        isVerified: true,
        role: { in: ['SELLER', 'COMPANY'] },
        products: {
          some: { isActive: true }
        }
      },
      select: { 
        id: true,
        name: true,
        dashboardSlug: true,
        updatedAt: true 
      },
      take: 500
    });

    // Get recent announcements
    const announcements = await prisma.announcement.findMany({
      where: { status: 'PUBLISHED' },
      select: { 
        id: true, 
        updatedAt: true 
      },
      take: 100,
      orderBy: { createdAt: 'desc' }
    });

    return {
      products,
      categories,
      sellers,
      announcements
    };
  } catch (error) {
    console.error('Error fetching dynamic routes:', error);
    return {
      products: [],
      categories: [],
      sellers: [],
      announcements: []
    };
  }
};

const generateSitemapXML = (routes: Array<{ url: string; lastModified?: Date; priority?: number; changeFrequency?: string }>) => {
  const baseUrl = 'https://poultrymarketke.vercel.app';
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${routes.map(route => `  <url>
    <loc>${baseUrl}${route.url}</loc>
    <lastmod>${(route.lastModified || new Date()).toISOString()}</lastmod>
    <changefreq>${route.changeFrequency || 'weekly'}</changefreq>
    <priority>${route.priority || 0.7}</priority>
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
};

export async function GET() {
  try {
    const dynamicData = await getDynamicRoutes();
    
    const routes = [
      // Static routes with high priority
      ...staticRoutes.map(route => ({
        url: route,
        lastModified: new Date(),
        priority: route === '' ? 1.0 : 0.8,
        changeFrequency: route === '' ? 'daily' : 'weekly'
      })),
      
      // Product pages
      ...dynamicData.products.map(product => ({
        url: `/product/${product.slug || product.id}`,
        lastModified: product.updatedAt,
        priority: 0.9,
        changeFrequency: 'daily'
      })),
      
      // Category pages
      ...dynamicData.categories.map(category => ({
        url: `/categories/${category.slug}`,
        lastModified: category.updatedAt,
        priority: 0.8,
        changeFrequency: 'weekly'
      })),
      
      // Seller/Store pages
      ...dynamicData.sellers.map(seller => ({
        url: `/seller/${seller.dashboardSlug || seller.id}`,
        lastModified: seller.updatedAt,
        priority: 0.7,
        changeFrequency: 'weekly'
      })),
      
      // Announcement pages (if they have individual pages)
      ...dynamicData.announcements.map(announcement => ({
        url: `/announcements/${announcement.id}`,
        lastModified: announcement.updatedAt,
        priority: 0.6,
        changeFrequency: 'monthly'
      }))
    ];

    const sitemap = generateSitemapXML(routes);

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}
