import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase/env'

export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabasePublishableKey
  )
}
