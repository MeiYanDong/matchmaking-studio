import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error('[auth] failed to read session from cookies:', error)
    return null
  }

  return session?.user ?? null
}

export async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return user
}
