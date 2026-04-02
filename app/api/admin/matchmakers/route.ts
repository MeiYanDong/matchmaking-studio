import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/supabase/env'

function createAdminSupabase() {
  return createSupabaseAdmin(
    supabaseUrl,
    supabaseServiceRoleKey
  )
}

function generateTempPassword() {
  return Math.random().toString(36).slice(-10) + 'Aa1!'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
    if (roleData?.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

    const { email, password, displayName } = await request.json()

    const adminSupabase = createAdminSupabase()
    const tempPassword = password || generateTempPassword()

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

    // Insert role
    await adminSupabase.from('user_roles').insert({
      user_id: newUser.user.id,
      role: 'matchmaker',
      display_name: displayName,
    })

    return NextResponse.json({ success: true, tempPassword })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
    if (roleData?.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

    const { userId, disabled } = await request.json()
    const adminSupabase = createAdminSupabase()

    const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
      ban_duration: disabled ? '876000h' : '0s',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
