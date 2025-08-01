import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
    }

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gt: new Date()
        }
      }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid or expired verification token' 
      }, { status: 400 })
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      }
    })
          createNotification({
            receiverId: user.id,
            title: 'Welcome to PoultryMarket',
            message: `Welcome to PoultryMarket, ${user.name}! Your account has been successfully created. Start exploring fresh poultry products from verified sellers across Kenya.`,
            type: 'EMAIL',
          })

    return NextResponse.json({ 
      message: 'Email verified successfully! You can now log in.' 
    })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}