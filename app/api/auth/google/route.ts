
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { googleId, email, name, avatar, emailVerified } = await request.json()

    if (!googleId || !email || !name) {
      return NextResponse.json({ error: 'Missing required Google profile data' }, { status: 400 })
    }

    // Check if user exists by Google ID or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email }
        ]
      }
    })

    if (user) {
      // Update existing user with Google data if not already set
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatar: avatar || user.avatar,
            emailVerified: emailVerified || user.emailVerified,
            lastLogin: new Date()
          }
        })
      } else {
        // Just update last login
        user = await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        })
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          googleId,
          email,
          name,
          avatar,
          role: 'CUSTOMER', // Default role
          emailVerified: emailVerified || false,
          isActive: true,
          lastLogin: new Date()
        }
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        emailVerified: user.emailVerified
      }
    })

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Google authentication error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
