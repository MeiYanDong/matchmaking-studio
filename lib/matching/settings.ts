import { createServiceRoleClient } from '@/lib/supabase/server'

const DEFAULT_THRESHOLD = 60

export async function getMatchThreshold() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'matching')
    .maybeSingle()

  const threshold = Number((data?.value as { threshold?: number } | null)?.threshold)
  return Number.isFinite(threshold) ? threshold : DEFAULT_THRESHOLD
}
