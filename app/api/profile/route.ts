import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        location: true,
        website: true,
        role: true,
        dashboardSlug: true,
        customDomain: true,
        isVerified: true,
        createdAt: true,
        tags: {
          select: {
            tag: true
          }
        }
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, phone, bio, location, website, avatar } = await request.json()

    const updatedProfile = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        phone,
        bio,
        location,
        website,
        avatar
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        location: true,
        website: true,
        role: true,
        dashboardSlug: true,
        customDomain: true,
        isVerified: true,
        createdAt: true,
        tags: {
          select: {
            tag: true
          }
        }
      }
    })

    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}