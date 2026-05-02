import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import remindersService from '@/modules/reminders/service'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reminders = await prisma.reminder.findMany({
      where: { userId: user.id },
      include: { flock: true },
      orderBy: [{ isActive: 'desc' }, { nextTriggerAt: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ reminders })
  } catch (error) {
    console.error('Reminders GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const reminder = await remindersService.createReminder({
      userId: user.id,
      title: body.title,
      description: body.description || null,
      type: body.type || 'EMAIL',
      frequency: body.frequency || 'ONCE',
      customInterval: body.customInterval ? Number(body.customInterval) : null,
      timeOfDay: body.timeOfDay || null,
      dayOfWeek: body.dayOfWeek !== undefined && body.dayOfWeek !== null && body.dayOfWeek !== ''
        ? Number(body.dayOfWeek)
        : null,
      nextTriggerAt: body.nextTriggerAt ? new Date(body.nextTriggerAt) : null,
      isActive: body.isActive ?? true,
      flockId: body.flockId || null,
    })

    return NextResponse.json({ reminder }, { status: 201 })
  } catch (error) {
    console.error('Reminders POST error:', error)
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 })
  }
}
