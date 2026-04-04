import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('[auth] failed to resolve verified user from Supabase:', error)
    return null
  }

  return user ?? null
}

export async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return user
}
