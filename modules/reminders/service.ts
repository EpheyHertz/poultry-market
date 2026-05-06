import { prisma } from '../../lib/prisma'
import { sendReminderEmail } from '../../lib/email'

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export async function computeNextTrigger(reminder: any) {
  const now = new Date()
  const base = reminder.nextTriggerAt || now

  switch (reminder.frequency) {
    case 'DAILY':
      return addDays(base, 1)
    case 'WEEKLY':
      return addDays(base, 7)
    case 'MONTHLY':
      return addMonths(base, 1)
    case 'CUSTOM':
      if (reminder.customInterval && reminder.customInterval > 0) {
        return addDays(base, reminder.customInterval)
      }
      return null
    case 'ONCE':
    default:
      return null
  }
}

export async function getDueReminders(limit = 100) {
  const now = new Date()
  return prisma.reminder.findMany({
    where: {
      isActive: true,
      nextTriggerAt: {
        lte: now,
      },
    },
    include: { user: true, flock: true },
    orderBy: { nextTriggerAt: 'asc' },
    take: limit,
  })
}

export async function markReminderSent(reminderId: string, nextTriggerAt: Date | null) {
  const now = new Date()
  const data: any = { lastSentAt: now }
  if (nextTriggerAt) {
    data.nextTriggerAt = nextTriggerAt
  } else {
    data.isActive = false
  }

  return prisma.reminder.update({ where: { id: reminderId }, data })
}

export async function sendDueReminders() {
  const due = await getDueReminders()
  const results: Array<{ id: string; success: boolean; error?: any }> = []

  for (const r of due) {
    try {
      const to = r.user?.email
      if (!to) {
        results.push({ id: r.id, success: false, error: 'no-recipient' })
        continue
      }

      const subject = `Reminder: ${r.title}`
      const html = `
        <p>Hi ${r.user.name || 'farmer'},</p>
        <p>${r.description || 'This is a reminder from your farm management.'}</p>
        <p><strong>Flock:</strong> ${r.flock?.name || '—'}</p>
        <p>Scheduled at: ${r.nextTriggerAt ? new Date(r.nextTriggerAt).toLocaleString() : 'Now'}</p>
      `

      await sendReminderEmail({ to, subject, html })

      const next = await computeNextTrigger(r)
      await markReminderSent(r.id, next)

      results.push({ id: r.id, success: true })
    } catch (error) {
      console.error('Failed sending reminder', r.id, error)
      results.push({ id: r.id, success: false, error })
    }
  }

  return results
}

export async function createReminder(payload: any) {
  const data = {
    title: payload.title,
    description: payload.description,
    type: payload.type || 'EMAIL',
    frequency: payload.frequency || 'ONCE',
    customInterval: payload.customInterval || null,
    timeOfDay: payload.timeOfDay || null,
    dayOfWeek: payload.dayOfWeek || null,
    nextTriggerAt: payload.nextTriggerAt || null,
    isActive: payload.isActive ?? true,
    flockId: payload.flockId || null,
    userId: payload.userId,
  }

  return prisma.reminder.create({ data })
}

export async function listRemindersForUser(userId: string) {
  return prisma.reminder.findMany({ where: { userId }, orderBy: { nextTriggerAt: 'asc' } })
}

export async function updateReminder(id: string, payload: any) {
  const data: any = { ...payload }
  return prisma.reminder.update({ where: { id }, data })
}

export async function deleteReminder(id: string) {
  return prisma.reminder.delete({ where: { id } })
}

export default {
  getDueReminders,
  sendDueReminders,
  createReminder,
  listRemindersForUser,
  updateReminder,
  deleteReminder,
}
