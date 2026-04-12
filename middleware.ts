// middleware.ts
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

  // Not authenticated
  if (!user) {
    if (path !== '/login') return NextResponse.redirect(new URL('/login', req.url))
    return supabaseResponse
  }

  const role = user.app_metadata?.role as string | undefined

  // Admin: redirect away from client routes
  if (role === 'admin') {
    const clientPaths = ['/collections', '/analytics', '/requests', '/onboarding', '/completed']
    if (path === '/' || path === '/login' || clientPaths.some(p => path.startsWith(p))) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return supabaseResponse
  }

  // Client: redirect away from admin
  if (path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // Client: stage-based routing
  const needsCheck =
    path === '/' ||
    path === '/login' ||
    path.startsWith('/onboarding') ||
    path.startsWith('/collections') ||
    path.startsWith('/analytics') ||
    path.startsWith('/requests') ||
    path.startsWith('/completed')

  if (needsCheck) {
    const { data: project } = await supabase
      .from('projects')
      .select('stage, project_status, onboarding_complete')
      .eq('client_user_id', user.id)
      .maybeSingle()

    const stage = project?.stage === 'production' ? 'production' : 'development'
    const status = project?.project_status ?? 'pago_recibido'
    const onboardingComplete = project?.onboarding_complete === true

    // Sin mantenimiento → only /completed
    if (stage === 'production' && status === 'entregado_sin_mantenimiento') {
      if (!path.startsWith('/completed')) {
        return NextResponse.redirect(new URL('/completed', req.url))
      }
      return supabaseResponse
    }

    if (stage === 'development') {
      // Root → onboarding
      if (path === '/' || path === '/login') {
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }
      // CMS only if onboarding complete
      if (path.startsWith('/collections') && !onboardingComplete) {
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }
      // Analytics, requests, completed always blocked in development
      if (
        path.startsWith('/analytics') ||
        path.startsWith('/requests') ||
        path.startsWith('/completed')
      ) {
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }
      return supabaseResponse
    }

    // Production con mantenimiento (or legacy 'entregado') — full access including /onboarding
    if (path === '/' || path === '/login') {
      return NextResponse.redirect(new URL('/collections', req.url))
    }
    // Block /completed for full-package clients
    if (path.startsWith('/completed')) {
      return NextResponse.redirect(new URL('/collections', req.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.webp|api/|auth/).*)'],
}
