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
    const clientPaths = ['/collections', '/analytics', '/requests', '/onboarding']
    if (path === '/' || path === '/login' || clientPaths.some(p => path.startsWith(p))) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return supabaseResponse
  }

  // Client: redirect away from admin
  if (path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // Client: stage-based routing — only query DB when accessing stage-relevant paths
  const productionRoutes = ['/collections', '/analytics', '/requests']
  const needsStageCheck =
    path === '/' ||
    path === '/login' ||
    path.startsWith('/onboarding') ||
    productionRoutes.some(p => path.startsWith(p))

  if (needsStageCheck) {
    const { data: project } = await supabase
      .from('projects')
      .select('stage')
      .eq('client_user_id', user.id)
      .maybeSingle()

    // Defensive type narrowing — DB has CHECK constraint but middleware is last line of defence.
    // On DB error, project is null and we default to 'development' (safe-fail).
    const stage = (project?.stage === 'production') ? 'production' : 'development'

    if (stage === 'development') {
      // Block production routes, redirect everything to /onboarding
      if (path === '/' || path === '/login' || productionRoutes.some(p => path.startsWith(p))) {
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }
    } else {
      // Block /onboarding, redirect to /collections
      if (path === '/' || path === '/login' || path.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/collections', req.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.webp|api/|auth/).*)'],
}
