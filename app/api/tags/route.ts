import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { TagType } from '@prisma/client'

export async function GET() {
  try {
    const tags = Object.values(TagType)
    return NextResponse.json({ tags })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, tag } = await request.json()

    // Check if tag already exists for user
    const existingTag = await prisma.userTag.findUnique({
      where: {
        userId_tag: {
          userId,
          tag: tag as TagType
        }
      }
    })

    if (existingTag) {
      return NextResponse.json({ error: 'Tag already exists for this user' }, { status: 400 })
    }

    const userTag = await prisma.userTag.create({
      data: {
        userId,
        tag: tag as TagType,
        addedBy: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(userTag)
  } catch (error) {
    console.error('Tag creation error:', error)
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
}