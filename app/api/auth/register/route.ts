import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { sendEmail, emailTemplates } from '@/lib/email'
import { sendWelcomeNotification } from '@/lib/notifications'
import { UserRole } from '@prisma/client'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, role } = await request.json()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Generate dashboard slug for sellers and companies
    let dashboardSlug: string | null = null

    if (role === 'SELLER' || role === 'COMPANY') {
      const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
      
      // Ensure unique slug
      let counter = 1
      let uniqueSlug = baseSlug
      while (await prisma.user.findFirst({ where: { dashboardSlug: uniqueSlug } })) {
        uniqueSlug = `${baseSlug}-${counter}`
        counter++
      }
      dashboardSlug = uniqueSlug
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: role as UserRole,
        dashboardSlug,
        verificationToken,
        verificationTokenExpiry,
        isVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dashboardSlug: true,
        isVerified: true,
      },
    })

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`
    
    await sendEmail({
      to: email,
      subject: 'Verify your email - PoultryMarket',
      html: emailTemplates.verification(name, verificationUrl),
    })

    // Send welcome notification
    // try {
    //   await sendWelcomeNotification({
    //     id: user.id,
    //     name: user.name,
    //     email: user.email,
    //     phone: phone,
    //     role: user.role
    //   })
    // } catch (notificationError) {
    //   console.error('Failed to send welcome notification:', notificationError)
    //   // Don't fail registration if notification fails
    // }

    return NextResponse.json({
      message: 'User created successfully. Please check your email to verify your account.',
      user,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
