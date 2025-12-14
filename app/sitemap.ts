import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

// Add proper caching and headers
export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://poultrymarketke.vercel.app'
  
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
      url: `${baseUrl}/blog`,
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
    // Use Promise.allSettled to prevent one query failure from breaking everything
    const [productsResult, categoriesResult, sellersResult, blogPostsResult, authorProfilesResult] = await Promise.allSettled([
      // Dynamic product routes with timeout
      prisma.product.findMany({
        where: {
          isActive: true,
        },
        select: {
          slug: true,
          updatedAt: true,
        },
        take: 1000, // Limit to prevent timeout
      }),
      
      // Dynamic category routes  
      prisma.category.findMany({
        select: {
          slug: true,
          updatedAt: true,
        },
      }),
      
      // Dynamic store/seller routes
      prisma.user.findMany({
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
        take: 500, // Limit to prevent timeout
      }),
      
      // Dynamic blog post routes
      prisma.blogPost.findMany({
        where: {
          status: 'PUBLISHED'
        },
        select: {
          slug: true,
          updatedAt: true,
          author: {
            select: {
              name: true
            }
          }
        },
        take: 1000, // Limit to prevent timeout
      }),
      
      // Dynamic author profile routes
      prisma.authorProfile.findMany({
        where: {
          isPublic: true
        },
        select: {
          username: true,
          updatedAt: true
        },
        take: 500
      })
    ])

    // Handle products
    const productRoutes = productsResult.status === 'fulfilled' 
      ? productsResult.value
          .filter(product => product.slug) // Only include products with slugs
          .map((product) => ({
            url: `${baseUrl}/product/${product.slug}`,
            lastModified: product.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
          }))
      : []

    // Handle categories
    const categoryRoutes = categoriesResult.status === 'fulfilled'
      ? categoriesResult.value
          .filter(category => category.slug) // Only include categories with slugs
          .map((category) => ({
            url: `${baseUrl}/categories/${category.slug}`,
            lastModified: category.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }))
      : []

    // Handle sellers
    const sellerRoutes = sellersResult.status === 'fulfilled'
      ? sellersResult.value
          .filter(seller => seller.dashboardSlug) // Only include sellers with dashboardSlug
          .map((seller) => ({
            url: `${baseUrl}/store/${seller.dashboardSlug}`,
            lastModified: seller.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          }))
      : []

    // Handle blog posts
    const blogRoutes = blogPostsResult.status === 'fulfilled'
      ? blogPostsResult.value
          .filter(post => post.slug && post.author?.name) // Only include posts with slugs and author names
          .map((post) => ({
            url: `${baseUrl}/blog/${post.author.name.replace(/\s+/g, '-').toLowerCase()}/${post.slug}`,
            lastModified: post.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }))
      : []

    // Handle author profiles
    const authorRoutes = authorProfilesResult.status === 'fulfilled'
      ? authorProfilesResult.value
          .filter(profile => profile.username)
          .map((profile) => ({
            url: `${baseUrl}/author/${profile.username}`,
            lastModified: profile.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          }))
      : []

    // Combine all routes
    const allRoutes = [
      ...staticRoutes,
      ...productRoutes,
      ...categoryRoutes,
      ...sellerRoutes,
      ...blogRoutes,
      ...authorRoutes,
    ];

    // Log sitemap stats in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sitemap generated:');
      console.log(`- Static routes: ${staticRoutes.length}`);
      console.log(`- Product routes: ${productRoutes.length}`);
      console.log(`- Category routes: ${categoryRoutes.length}`);
      console.log(`- Seller routes: ${sellerRoutes.length}`);
      console.log(`- Blog routes: ${blogRoutes.length}`);
      console.log(`- Total: ${allRoutes.length}`);
    }

    return allRoutes;

  } catch (error) {
    console.error('Error generating sitemap:', error)
    // Return at least static routes if database fails
    return staticRoutes
  }
}
