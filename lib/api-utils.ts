import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from './auth'
import { UserRole } from '@prisma/client'

export async function authenticateRequest(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  return user
}

export async function requireRole(request: NextRequest, allowedRoles: UserRole[]) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  return user
}

export function createApiResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status })
}

export function createApiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}