import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase/env'
import type { Database } from '@/types/database'

type CookieStore = Awaited<ReturnType<typeof cookies>>

export const createClient = (cookieStore: CookieStore) =>
  createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components can't persist cookies during render.
          }
        },
      },
    }
  )
