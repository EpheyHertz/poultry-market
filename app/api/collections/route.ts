
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured') === 'true'

    const collections = await prisma.collection.findMany({
      where: { 
        isActive: true,
        ...(featured && { isFeatured: true })
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                isActive: true,
                seller: {
                  select: {
                    id: true,
                    name: true,
                    role: true
                  }
                }
              }
            }
          },
          take: 10
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(collections)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, slug, description, image, isFeatured } = await request.json()

    const collection = await prisma.collection.create({
      data: {
        name,
        slug,
        description,
        image,
        isFeatured
      }
    })

    return NextResponse.json(collection)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
  }
}
