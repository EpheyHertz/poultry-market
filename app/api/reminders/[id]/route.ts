import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import remindersService from '@/modules/reminders/service'

async function getOwnedReminder(id: string, userId: string) {
  return prisma.reminder.findFirst({
    where: { id, userId },
    include: { flock: true },
  })
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await getOwnedReminder(context.params.id, user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    const body = await request.json()
    const reminder = await remindersService.updateReminder(existing.id, {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      type: body.type ?? existing.type,
      frequency: body.frequency ?? existing.frequency,
      customInterval: body.customInterval === '' || body.customInterval === null || body.customInterval === undefined
        ? existing.customInterval
        : Number(body.customInterval),
      timeOfDay: body.timeOfDay ?? existing.timeOfDay,
      dayOfWeek: body.dayOfWeek === '' || body.dayOfWeek === null || body.dayOfWeek === undefined
        ? existing.dayOfWeek
        : Number(body.dayOfWeek),
      nextTriggerAt: body.nextTriggerAt ? new Date(body.nextTriggerAt) : existing.nextTriggerAt,
      isActive: body.isActive ?? existing.isActive,
      flockId: body.flockId === '' ? null : (body.flockId ?? existing.flockId),
    })

    return NextResponse.json({ reminder })
  } catch (error) {
    console.error('Reminders PUT error:', error)
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await getOwnedReminder(context.params.id, user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    await remindersService.deleteReminder(existing.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reminders DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 })
  }
}
