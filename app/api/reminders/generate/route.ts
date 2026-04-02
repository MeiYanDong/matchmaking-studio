import { NextRequest, NextResponse } from 'next/server'
import { checkMeetingReminder, checkNoFollowup, checkNoNewInfo, checkPendingConfirmation } from '@/lib/reminders/generate'

export async function GET(request: NextRequest) {
  // Simple auth check - require a secret token in production
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await Promise.all([
      checkNoFollowup(),
      checkNoNewInfo(),
      checkMeetingReminder(),
      checkPendingConfirmation(),
    ])
    return NextResponse.json({ success: true, generated_at: new Date().toISOString() })
  } catch (error) {
    console.error('Reminder generation error:', error)
    return NextResponse.json({ error: '生成提醒失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
