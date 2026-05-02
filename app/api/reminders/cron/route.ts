import { NextResponse } from 'next/server'
import reminders from '../../../../modules/reminders/service'

export async function GET() {
  try {
    const results = await reminders.sendDueReminders()
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Cron trigger failed', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
