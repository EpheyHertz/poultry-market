import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !await comparePassword(password, user.password as string)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if email is verified
    if (!user.isVerified) {
      return NextResponse.json({ 
        error: 'Please verify your email before logging in. Check your inbox for the verification link.' 
      }, { status: 401 })
    }

    const token = await signToken({ userId: user.id,userRole: user.role })
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
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}