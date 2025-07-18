
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {signToken} from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { googleId, email, name, avatar, emailVerified } = await request.json()

    if (!googleId || !email || !name) {
      return NextResponse.json({ error: 'Missing required Google profile data' }, { status: 400 })
    }
// googleId: payload.sub,
//           email: payload.email,
//           name: payload.name,
//           avatar: payload.picture,
//           emailVerified: payload.email_verified,
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
            isVerified: emailVerified || user.isVerified,
            
          }
        })
      } else {
        // Just update last login
        // user = await prisma.user.update({
        //   where: { id: user.id },
        //   data: { lastLogin: new Date() }
        // })
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
          isVerified: emailVerified || false,
          isActive: true,
         
        }
      })
    }

    // Generate JWT token
    const token = await signToken({ userId: user.id, userRole: user.role })
        const cookieStore = await cookies()
    
        cookieStore.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60, // 24 hours
          path: '/',
        })

//  console.log('User authenticated:', user)
//  console.log('JWT token generated:', token)

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        emailVerified: user.isVerified
      }
    })

    


    return response
  } catch (error) {
    console.error('Google authentication error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
