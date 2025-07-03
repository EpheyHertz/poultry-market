import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { UserRole } from '@prisma/client'

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

    // Generate dashboard slug for sellers and companies
    let dashboardSlug = null
    if (role === 'SELLER' || role === 'COMPANY') {
      dashboardSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
      
      // Ensure unique slug
      let counter = 1
      let uniqueSlug = dashboardSlug
      while (await prisma.user.findFirst({ where: { dashboardSlug: uniqueSlug } })) {
        uniqueSlug = `${dashboardSlug}-${counter}`
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
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dashboardSlug: true,
      },
    })

    return NextResponse.json({
      message: 'User created successfully',
      user,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}