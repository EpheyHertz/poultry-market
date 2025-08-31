import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://poultrymarketke.vercel.app'
  
  // Static routes
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/announcements`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/chatbot`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/auth/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ]

  try {
    // Dynamic product routes
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        seller: {
          isVerified: true
        }
      },
      select: {
        id: true,
        updatedAt: true,
      },
    })

    const productRoutes = products.map((product) => ({
      url: `${baseUrl}/product/${product.id}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    // Dynamic category routes
    const categories = await prisma.category.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const categoryRoutes = categories.map((category) => ({
      url: `${baseUrl}/categories/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // Dynamic store/seller routes
    const sellers = await prisma.user.findMany({
      where: {
        role: 'SELLER',
        isVerified: true,
        dashboardSlug: {
          not: null
        }
      },
      select: {
        dashboardSlug: true,
        updatedAt: true,
      },
    })

    const sellerRoutes = sellers.map((seller) => ({
      url: `${baseUrl}/store/${seller.dashboardSlug}`,
      lastModified: seller.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    // Combine all routes
    return [
      ...staticRoutes,
      ...productRoutes,
      ...categoryRoutes,
      ...sellerRoutes,
    ]

  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Return at least static routes if database fails
    return staticRoutes
  }
}
