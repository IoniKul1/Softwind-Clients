import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = req.nextUrl.pathname

  if (!user) {
    if (path !== '/login') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return supabaseResponse
  }

  // Get role from app_metadata (set when creating user via admin API)
  const role = user.app_metadata?.role as string | undefined

  if (path === '/login') {
    return NextResponse.redirect(
      new URL(role === 'admin' ? '/admin' : '/collections', req.url)
    )
  }
  if (path === '/' || path === '') {
    return NextResponse.redirect(
      new URL(role === 'admin' ? '/admin' : '/collections', req.url)
    )
  }
  if (role !== 'admin' && path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/collections', req.url))
  }
  if (role === 'admin' && (path.startsWith('/collections') || path.startsWith('/analytics') || path.startsWith('/requests'))) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.webp|api/|auth/).*)'],
}
