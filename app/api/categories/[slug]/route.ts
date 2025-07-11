// app/api/categories/[slug]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest
) {
    const slug = request.nextUrl.pathname.split('/').pop() || ''
  try {
    const category = await prisma.category.findUnique({
      where: { slug: slug },
      include: {
        products: {
          include: {
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    tags: true
                  }
                },
                tags: true
              }
            }
          }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const products = category.products
      .map((p) => p.product)
      .filter((p) => p && p.isActive)

    return NextResponse.json({
      category: {
        name: category.name,
        description: category.description,
        slug: category.slug
      },
      products
    })
  } catch (error) {
    console.error('Failed to fetch category:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
