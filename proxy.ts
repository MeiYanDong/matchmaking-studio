import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseProxyClient } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  const supabaseMiddleware = createSupabaseProxyClient(request)
  const { supabase } = supabaseMiddleware

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/user/login') ||
    pathname.startsWith('/api/')
  ) {
    return supabaseMiddleware.response
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (pathname.startsWith('/matchmaker') && !['matchmaker', 'admin'].includes(roleData?.role ?? '')) {
    return NextResponse.redirect(new URL('/user/me', request.url))
  }

  if (pathname.startsWith('/admin') && roleData?.role !== 'admin') {
    return NextResponse.redirect(
      new URL(roleData?.role === 'matchmaker' ? '/matchmaker/clients' : '/user/me', request.url)
    )
  }

  if (pathname.startsWith('/user') && roleData?.role === 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  if (pathname.startsWith('/user') && roleData?.role === 'matchmaker') {
    return NextResponse.redirect(new URL('/matchmaker/clients', request.url))
  }

  return supabaseMiddleware.response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
