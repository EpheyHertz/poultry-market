import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Blog category definitions with metadata
const BLOG_CATEGORIES = {
  FARMING_TIPS: {
    name: 'Farming Tips',
    description: 'Practical advice and techniques for successful poultry farming',
    icon: '🌱',
    color: '#10B981'
  },
  POULTRY_HEALTH: {
    name: 'Poultry Health',
    description: 'Health management, disease prevention, and veterinary care',
    icon: '🏥',
    color: '#EF4444'
  },
  FEED_NUTRITION: {
    name: 'Feed & Nutrition',
    description: 'Nutritional guidance and feed management strategies',
    icon: '🌾',
    color: '#F59E0B'
  },
  EQUIPMENT_GUIDES: {
    name: 'Equipment Guides',
    description: 'Reviews and guides for poultry farming equipment',
    icon: '🔧',
    color: '#6B7280'
  },
  MARKET_TRENDS: {
    name: 'Market Trends',
    description: 'Industry insights, pricing trends, and market analysis',
    icon: '📈',
    color: '#3B82F6'
  },
  SUCCESS_STORIES: {
    name: 'Success Stories',
    description: 'Inspiring stories from successful poultry farmers',
    icon: '🏆',
    color: '#F97316'
  },
  INDUSTRY_NEWS: {
    name: 'Industry News',
    description: 'Latest news and updates from the poultry industry',
    icon: '📰',
    color: '#8B5CF6'
  },
  SEASONAL_ADVICE: {
    name: 'Seasonal Advice',
    description: 'Season-specific farming tips and preparations',
    icon: '🌤️',
    color: '#06B6D4'
  },
  BEGINNER_GUIDES: {
    name: 'Beginner Guides',
    description: 'Essential guides for new poultry farmers',
    icon: '📚',
    color: '#84CC16'
  },
  ADVANCED_TECHNIQUES: {
    name: 'Advanced Techniques',
    description: 'Advanced strategies for experienced farmers',
    icon: '🎯',
    color: '#EC4899'
  }
};

// GET - Fetch all categories with post counts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withCounts = searchParams.get('withCounts') === 'true';

    let categoriesWithCounts: any[] = [];

    if (withCounts) {
      // Get post counts for each category
      const categoryCounts = await Promise.all(
        Object.keys(BLOG_CATEGORIES).map(async (categoryKey) => {
          const count = await prisma.blogPost.count({
            where: {
              category: categoryKey as any,
              status: 'PUBLISHED'
            }
          });

          return {
            key: categoryKey,
            ...BLOG_CATEGORIES[categoryKey as keyof typeof BLOG_CATEGORIES],
            postCount: count
          };
        })
      );

      categoriesWithCounts = categoryCounts;
    } else {
      categoriesWithCounts = Object.entries(BLOG_CATEGORIES).map(([key, category]) => ({
        key,
        ...category
      }));
    }

    // Sort by post count (descending) if counts are included, otherwise by name
    if (withCounts) {
      categoriesWithCounts.sort((a, b) => b.postCount - a.postCount);
    } else {
      categoriesWithCounts.sort((a, b) => a.name.localeCompare(b.name));
    }

    return NextResponse.json({ categories: categoriesWithCounts });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}