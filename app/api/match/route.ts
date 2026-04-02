import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runMatchingForProfile } from '@/lib/matching/engine'

export async function POST(request: NextRequest) {
  try {
    const { profileId } = await request.json()
    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { data: triggerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .eq('matchmaker_id', user.id)
      .single()

    if (!triggerProfile) {
      return NextResponse.json({ error: '用户不存在或无权限' }, { status: 404 })
    }

    const result = await runMatchingForProfile(profileId)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Match error:', error)
    return NextResponse.json({ error: '匹配失败' }, { status: 500 })
  }
}
