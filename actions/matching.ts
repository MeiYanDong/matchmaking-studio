'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { runMatchingForProfile } from '@/lib/matching/engine'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') throw new Error('无权限')
}

export async function rerunMatchingForProfile(profileId: string) {
  await requireAdmin()
  const result = await runMatchingForProfile(profileId)
  revalidatePath('/admin/clients')
  revalidatePath('/admin/matches')
  revalidatePath(`/matchmaker/clients/${profileId}`)
  revalidatePath('/matchmaker/matches')
  return result
}

export async function rerunMatchingForAll() {
  await requireAdmin()

  const supabase = createServiceRoleClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('status', 'active')

  let matched = 0
  for (const profile of profiles ?? []) {
    const result = await runMatchingForProfile(profile.id)
    matched += result.matched
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/clients')
  revalidatePath('/admin/matches')
  revalidatePath('/matchmaker/matches')
  return { profiles: profiles?.length ?? 0, matched }
}

export async function updateMatchingThreshold(threshold: number) {
  await requireAdmin()

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key: 'matching',
      value: { threshold },
      description: '匹配引擎相关配置',
    }, { onConflict: 'key' })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/matches')
}
