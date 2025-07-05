import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { googleId, email, name, avatar } = await request.json()

    if (!googleId || !email || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user exists with Google ID
    let user = await prisma.user.findUnique({
      where: { googleId }
    })

    if (!user) {
      // Check if user exists with email
      user = await prisma.user.findUnique({
        where: { email }
      })

      if (user) {
        // Link Google account to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            googleId,
            isVerified: true, // Google accounts are pre-verified
            avatar: avatar || user.avatar
          }
        })
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            googleId,
            email,
            name,
            avatar,
            isVerified: true, // Google accounts are pre-verified
            role: 'CUSTOMER'
          }
        })
      }
    }

    const token = await signToken({ userId: user.id })
    const cookieStore = await cookies()

    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified
      },
    })
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}