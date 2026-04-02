export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ''

export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
