# Client Lifecycle Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the client lifecycle: unlock CMS for development clients who complete onboarding, split delivery into "sin/con mantenimiento", add a completion screen for clients without maintenance, and let production-with-maintenance clients re-edit their onboarding.

**Architecture:** DB migration adds `onboarding_complete boolean` and two new `project_status` values. Middleware reads all three fields (`stage`, `project_status`, `onboarding_complete`) and routes to the right experience. A shared `lib/sidebar.ts` helper computes the sidebar mode from those fields. ClientSidebar receives a `mode` string instead of `stage`. All four client layouts and the new `/completed` layout pass the computed mode. Admin delivery splits into two confirmation paths.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL, TypeScript, Tailwind CSS, Vitest + React Testing Library.

---

## File Map

| Action | File |
|---|---|
| Create | `supabase/migrations/update_project_status_lifecycle.sql` |
| Create | `lib/sidebar.ts` |
| Create | `app/completed/layout.tsx` |
| Create | `app/completed/page.tsx` |
| Modify | `lib/types.ts` |
| Modify | `middleware.ts` |
| Modify | `app/api/onboarding/route.ts` |
| Modify | `components/ClientSidebar.tsx` |
| Modify | `app/onboarding/layout.tsx` |
| Modify | `app/collections/layout.tsx` |
| Modify | `app/analytics/layout.tsx` |
| Modify | `app/requests/layout.tsx` |
| Modify | `app/api/project-status/route.ts` |
| Modify | `components/admin/ProjectStatusSelector.tsx` |
| Modify | `__tests__/api/onboarding.test.ts` |

---

### Task 1: DB migration + TypeScript types

**Files:**
- Create: `supabase/migrations/update_project_status_lifecycle.sql`
- Modify: `lib/types.ts`

- [ ] **Step 1: Create the migration SQL file**

Create `supabase/migrations/update_project_status_lifecycle.sql`:

```sql
-- Add onboarding_complete flag
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Expand project_status check constraint to include maintenance variants
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_project_status_check
  CHECK (project_status IN (
    'pago_recibido',
    'en_desarrollo',
    'esperando_feedback',
    'entregado',
    'entregado_sin_mantenimiento',
    'entregado_con_mantenimiento'
  ));
```

- [ ] **Step 2: Run the migration manually**

Go to the Supabase SQL editor for this project and run the contents of `supabase/migrations/update_project_status_lifecycle.sql`. Confirm it executes without errors.

- [ ] **Step 3: Update TypeScript types**

Replace the contents of `lib/types.ts` — only the `ProjectStatus` type and `Project` interface change:

```typescript
export type ProjectStage = 'development' | 'production'

export type ProjectStatus =
  | 'pago_recibido'
  | 'en_desarrollo'
  | 'esperando_feedback'
  | 'entregado'
  | 'entregado_sin_mantenimiento'
  | 'entregado_con_mantenimiento'

export interface OnboardingBrand {
  logo_url?: string
  isologo_url?: string
  favicon_url?: string
  brand_guide_url?: string
}

export interface OnboardingTypography {
  display_name?: string
  display_file_url?: string
  display_google_url?: string
  body_name?: string
  body_file_url?: string
  body_google_url?: string
  accent_name?: string
}

export interface OnboardingColor {
  name: string
  hex: string
}

export interface OnboardingReference {
  url?: string
  image_url?: string
  note?: string
}

export interface OnboardingPreviousSite {
  na?: boolean
  url?: string
  likes?: string
  dislikes?: string
}

export interface OnboardingContent {
  files?: Array<{ url: string; name: string }>
  notes?: string
}

export interface OnboardingBusiness {
  industry?: string
  audience?: string
  competitors?: string[]
  social?: Record<string, string>
  tone?: string
}

export interface OnboardingData {
  brand?: OnboardingBrand
  typography?: OnboardingTypography
  colors?: OnboardingColor[]
  references?: OnboardingReference[]
  previous_site?: OnboardingPreviousSite
  content?: OnboardingContent
  business?: OnboardingBusiness
}

export interface Profile {
  id: string
  role: 'admin' | 'client'
  name: string
  created_at: string
}

export interface Project {
  id: string
  client_user_id: string
  name: string
  framer_project_url: string
  framer_api_key_encrypted: string
  website_url?: string
  created_at: string
  stage: ProjectStage
  project_status: ProjectStatus
  onboarding_data: OnboardingData
  onboarding_complete: boolean
  admin_notes?: string
  meeting_file_url?: string
}

export interface ClientWithProject {
  id: string
  email: string
  role: 'admin' | 'client'
  name: string
  created_at: string
  project: Project | null
}

export type FramerFieldType =
  | 'string'
  | 'formattedText'
  | 'number'
  | 'date'
  | 'boolean'
  | 'color'
  | 'image'
  | 'file'
  | 'link'
  | 'enum'
  | 'array'

export interface FramerEnumCase {
  id: string
  name: string
}

export interface FramerField {
  id: string
  name: string
  type: FramerFieldType
  userEditable?: boolean
  required?: boolean
  cases?: FramerEnumCase[]
}

export interface FramerFieldValue {
  type: string
  value: unknown
  contentType?: 'markdown' | 'html'
}

export interface FramerItem {
  id: string
  slug: string
  draft?: boolean
  fieldData: Record<string, FramerFieldValue>
}

export interface FramerCollection {
  id: string
  name: string
}
```

- [ ] **Step 4: Run the existing test suite to confirm no type errors broke things**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run 2>&1 | tail -10
```

Expected: same pass/fail as before (pre-existing Framer failure is acceptable).

- [ ] **Step 5: Commit**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && git add supabase/migrations/update_project_status_lifecycle.sql lib/types.ts && git commit -m "feat: add onboarding_complete column and maintenance delivery statuses"
```

---

### Task 2: lib/sidebar.ts — SidebarMode helper

**Files:**
- Create: `lib/sidebar.ts`
- Create: `__tests__/lib/sidebar.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/sidebar.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeSidebarMode } from '@/lib/sidebar'

describe('computeSidebarMode', () => {
  it('returns dev_incomplete for development stage with incomplete onboarding', () => {
    expect(computeSidebarMode('development', false)).toBe('dev_incomplete')
  })

  it('returns dev_complete for development stage with complete onboarding', () => {
    expect(computeSidebarMode('development', true)).toBe('dev_complete')
  })

  it('returns production_full for production stage regardless of onboarding', () => {
    expect(computeSidebarMode('production', false)).toBe('production_full')
    expect(computeSidebarMode('production', true)).toBe('production_full')
  })

  it('defaults to dev_incomplete for unknown stage', () => {
    expect(computeSidebarMode('unknown', false)).toBe('dev_incomplete')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run __tests__/lib/sidebar.test.ts 2>&1 | tail -10
```

Expected: FAIL — cannot find module `@/lib/sidebar`.

- [ ] **Step 3: Implement lib/sidebar.ts**

Create `lib/sidebar.ts`:

```typescript
export type SidebarMode = 'dev_incomplete' | 'dev_complete' | 'production_full'

export function computeSidebarMode(
  stage: string,
  onboardingComplete: boolean
): SidebarMode {
  if (stage !== 'production') {
    return onboardingComplete ? 'dev_complete' : 'dev_incomplete'
  }
  return 'production_full'
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run __tests__/lib/sidebar.test.ts 2>&1 | tail -10
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && git add lib/sidebar.ts __tests__/lib/sidebar.test.ts && git commit -m "feat: add SidebarMode type and computeSidebarMode helper"
```

---

### Task 3: Onboarding API — set onboarding_complete on save

**Files:**
- Modify: `app/api/onboarding/route.ts`
- Modify: `__tests__/api/onboarding.test.ts`

- [ ] **Step 1: Update the existing test to expect onboarding_complete in the update call**

Read `__tests__/api/onboarding.test.ts`. The last test (`returns 200 and merges section data`) currently asserts:

```typescript
expect(mockUpdate).toHaveBeenCalledWith({
  onboarding_data: {
    colors: [],
    brand: { logo_url: 'https://x.com/logo.png' },
  },
})
```

Replace that assertion and add a new test for the completion flag. The full updated file:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/onboarding/route'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
  })),
}))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
  })),
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/onboarding', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('PATCH /api/onboarding', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(makeRequest({ section: 'brand', data: {} }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid section', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const res = await PATCH(makeRequest({ section: 'invalid', data: {} }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when section is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const res = await PATCH(makeRequest({ data: {} }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when project not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const res = await PATCH(makeRequest({ section: 'brand', data: { logo_url: 'https://x.com/logo.png' } }))
    expect(res.status).toBe(404)
  })

  it('returns 200, merges section data, and sets onboarding_complete false when not all sections done', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    // Only brand section present — onboarding not complete
    mockSingle.mockResolvedValue({ data: { id: 'proj-1', onboarding_data: {} }, error: null })
    const res = await PATCH(makeRequest({ section: 'brand', data: { logo_url: 'https://x.com/logo.png' } }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      onboarding_data: { brand: { logo_url: 'https://x.com/logo.png' } },
      onboarding_complete: false,
    }))
  })

  it('sets onboarding_complete true when all 7 sections are present and complete', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    // Pre-fill 6 sections; the PATCH will add the 7th (business)
    const existing = {
      brand: { logo_url: 'https://x.com/logo.png' },
      typography: { display_name: 'Playfair' },
      colors: [{ name: 'Azul', hex: '#3B5BF6' }],
      references: [{ url: 'https://example.com' }],
      previous_site: { na: true },
      content: { notes: 'some notes' },
    }
    mockSingle.mockResolvedValue({ data: { id: 'proj-1', onboarding_data: existing }, error: null })
    const businessData = { industry: 'Tech', audience: 'SMBs', tone: 'Formal' }
    const res = await PATCH(makeRequest({ section: 'business', data: businessData }))
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      onboarding_complete: true,
    }))
  })
})
```

- [ ] **Step 2: Run the updated tests to confirm the new assertions fail**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run __tests__/api/onboarding.test.ts 2>&1 | tail -15
```

Expected: the two new/updated tests FAIL (mockUpdate not called with `onboarding_complete`).

- [ ] **Step 3: Update the API route**

Replace the full contents of `app/api/onboarding/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ONBOARDING_SECTIONS, isSectionComplete } from '@/lib/onboarding'
import type { OnboardingData } from '@/lib/types'

const VALID_SECTIONS = ['brand', 'typography', 'colors', 'references', 'previous_site', 'content', 'business']

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { section, data } = body as { section?: string; data?: unknown }

  if (!section || !VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: project, error: fetchError } = await adminClient
    .from('projects')
    .select('id, onboarding_data')
    .eq('client_user_id', user.id)
    .single()

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const current = (project.onboarding_data as Record<string, unknown>) ?? {}
  const updated = { ...current, [section]: data }

  const allComplete = ONBOARDING_SECTIONS.every(s =>
    isSectionComplete(updated as OnboardingData, s.key)
  )

  const { error: updateError } = await adminClient
    .from('projects')
    .update({ onboarding_data: updated, onboarding_complete: allComplete })
    .eq('id', project.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run __tests__/api/onboarding.test.ts 2>&1 | tail -10
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && git add app/api/onboarding/route.ts __tests__/api/onboarding.test.ts && git commit -m "feat: compute and persist onboarding_complete on each section save"
```

---

### Task 4: Middleware redesign

**Files:**
- Modify: `middleware.ts`

> No unit tests for middleware (it uses Next.js server internals that don't test well in Vitest). Manual verification is the test for this task.

- [ ] **Step 1: Replace middleware.ts with the new routing logic**

```typescript
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
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run 2>&1 | tail -10
```

Expected: same results as before (pre-existing Framer failure acceptable).

- [ ] **Step 3: Commit**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && git add middleware.ts && git commit -m "feat: redesign middleware routing for dev/production/completed stages"
```

---

### Task 5: ClientSidebar — replace stage prop with mode

**Files:**
- Modify: `components/ClientSidebar.tsx`

- [ ] **Step 1: Replace the full content of components/ClientSidebar.tsx**

```tsx
// components/ClientSidebar.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import type { SidebarMode } from '@/lib/sidebar'

interface Props {
  name: string
  websiteUrl?: string | null
  mode: SidebarMode
}

export default function ClientSidebar({ name, websiteUrl, mode }: Props) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const domain = websiteUrl ? websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : null

  const navItem = (href: string, label: string, badge?: string) => {
    const active = pathname === href || (
      href !== '/collections' &&
      href !== '/onboarding' &&
      pathname.startsWith(href)
    )
    return (
      <Link
        href={href}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
          active
            ? 'bg-neutral-800 text-white'
            : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
        }`}
      >
        <span className="flex-1">{label}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-400">{badge}</span>
        )}
      </Link>
    )
  }

  const isProduction = mode === 'production_full'

  const sidebar = (
    <aside className={`
      fixed md:static inset-y-0 left-0 z-50
      w-64 md:w-56 shrink-0
      flex flex-col
      border-r border-neutral-800
      min-h-screen px-4 py-6
      bg-neutral-950
      transform transition-transform duration-200
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      <button
        className="md:hidden absolute top-4 right-4 text-neutral-500 hover:text-white text-xl leading-none"
        onClick={() => setIsOpen(false)}
      >
        ×
      </button>

      <div className="mb-8 px-1 flex items-center gap-2">
        <img src="/isologo.png" alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
        <span style={{ fontFamily: 'Cal Sans, sans-serif', fontSize: 16 }}>Softwind</span>
      </div>

      <div className="px-1 mb-6">
        <p className="text-xs font-medium text-white leading-tight truncate">{name}</p>
        {domain && (
          <a
            href={websiteUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 mt-1 group"
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isProduction ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300 transition truncate">{domain}</span>
          </a>
        )}
        {!isProduction && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-400 border border-indigo-800">
            En desarrollo
          </span>
        )}
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {mode === 'dev_incomplete' && navItem('/onboarding', 'Mi Sitio')}
        {mode === 'dev_complete' && (
          <>
            {navItem('/onboarding', 'Mi Sitio')}
            {navItem('/collections', 'Content Manager')}
          </>
        )}
        {mode === 'production_full' && (
          <>
            {navItem('/onboarding', 'Onboarding')}
            {navItem('/collections', 'Content Manager')}
            {navItem('/analytics', 'Analytics', 'beta')}
            {navItem('/requests', 'Pedidos de cambios')}
          </>
        )}
      </nav>

      <div className="px-3 pt-4 border-t border-neutral-800">
        <LogoutButton />
      </div>
    </aside>
  )

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-14 bg-neutral-950 border-b border-neutral-800">
        <button
          onClick={() => setIsOpen(true)}
          className="text-neutral-400 hover:text-white transition p-1"
          aria-label="Abrir menú"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <img src="/isologo.png" alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
        <span style={{ fontFamily: 'Cal Sans, sans-serif', fontSize: 15 }}>Softwind</span>
      </div>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setIsOpen(false)}
        />
      )}

      {sidebar}
    </>
  )
}
```

- [ ] **Step 2: Run the full test suite**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run 2>&1 | tail -10
```

Expected: same results as before. (The layouts that pass `stage=` will now have TypeScript errors in the editor but those are fixed in Task 6.)

- [ ] **Step 3: Commit**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && git add components/ClientSidebar.tsx && git commit -m "feat: replace stage prop with SidebarMode in ClientSidebar"
```

---

### Task 6: Update four client layouts to pass mode

**Files:**
- Modify: `app/onboarding/layout.tsx`
- Modify: `app/collections/layout.tsx`
- Modify: `app/analytics/layout.tsx`
- Modify: `app/requests/layout.tsx`

All four layouts follow the same pattern: fetch `name`, `website_url`, `stage`, `onboarding_complete` from projects; compute `mode`; pass to `ClientSidebar`.

- [ ] **Step 1: Replace app/onboarding/layout.tsx**

```tsx
// app/onboarding/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientSidebar from '@/components/ClientSidebar'
import { computeSidebarMode } from '@/lib/sidebar'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: project }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('projects').select('website_url, stage, onboarding_complete').eq('client_user_id', user.id).maybeSingle(),
  ])

  const mode = computeSidebarMode(project?.stage ?? 'development', project?.onboarding_complete ?? false)

  return (
    <div className="flex min-h-screen">
      <ClientSidebar
        name={profile?.name ?? 'Cliente'}
        websiteUrl={project?.website_url ?? null}
        mode={mode}
      />
      <main className="flex-1 px-4 py-6 pt-20 md:px-10 md:py-10 md:pt-10 min-w-0">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Replace app/collections/layout.tsx**

```tsx
// app/collections/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientSidebar from '@/components/ClientSidebar'
import { computeSidebarMode } from '@/lib/sidebar'

export default async function CollectionsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: project }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('projects').select('website_url, stage, onboarding_complete').eq('client_user_id', user.id).maybeSingle(),
  ])

  const mode = computeSidebarMode(project?.stage ?? 'development', project?.onboarding_complete ?? false)

  return (
    <div className="flex min-h-screen">
      <ClientSidebar
        name={profile?.name ?? 'Cliente'}
        websiteUrl={project?.website_url ?? null}
        mode={mode}
      />
      <main className="flex-1 px-4 py-6 pt-20 md:px-10 md:py-10 md:pt-10 min-w-0">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Replace app/analytics/layout.tsx**

```tsx
// app/analytics/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientSidebar from '@/components/ClientSidebar'
import { computeSidebarMode } from '@/lib/sidebar'

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: project }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('projects').select('website_url, stage, onboarding_complete').eq('client_user_id', user.id).maybeSingle(),
  ])

  const mode = computeSidebarMode(project?.stage ?? 'development', project?.onboarding_complete ?? false)

  return (
    <div className="flex min-h-screen">
      <ClientSidebar
        name={profile?.name ?? 'Cliente'}
        websiteUrl={project?.website_url ?? null}
        mode={mode}
      />
      <main className="flex-1 px-4 py-6 pt-20 md:px-10 md:py-10 md:pt-10 min-w-0">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Replace app/requests/layout.tsx**

```tsx
// app/requests/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientSidebar from '@/components/ClientSidebar'
import { computeSidebarMode } from '@/lib/sidebar'

export default async function RequestsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: project }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('projects').select('website_url, stage, onboarding_complete').eq('client_user_id', user.id).maybeSingle(),
  ])

  const mode = computeSidebarMode(project?.stage ?? 'development', project?.onboarding_complete ?? false)

  return (
    <div className="flex min-h-screen">
      <ClientSidebar
        name={profile?.name ?? 'Cliente'}
        websiteUrl={project?.website_url ?? null}
        mode={mode}
      />
      <main className="flex-1 px-4 py-6 pt-20 md:px-10 md:py-10 md:pt-10 min-w-0">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Run the full test suite**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run 2>&1 | tail -10
```

Expected: same results as before.

- [ ] **Step 6: Commit**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && git add app/onboarding/layout.tsx app/collections/layout.tsx app/analytics/layout.tsx app/requests/layout.tsx && git commit -m "feat: update client layouts to pass SidebarMode from project data"
```

---

### Task 7: /completed route — layout + page

**Files:**
- Create: `app/completed/layout.tsx`
- Create: `app/completed/page.tsx`

- [ ] **Step 1: Create app/completed/layout.tsx**

```tsx
// app/completed/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CompletedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('project_status')
    .eq('client_user_id', user.id)
    .maybeSingle()

  // Only sin_mantenimiento clients belong here
  if (project?.project_status !== 'entregado_sin_mantenimiento') {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create app/completed/page.tsx**

```tsx
// app/completed/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CompletedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('name, website_url')
    .eq('client_user_id', user.id)
    .maybeSingle()

  const websiteUrl = project?.website_url ?? null
  const projectName = project?.name ?? 'Tu sitio'

  return (
    <div className="max-w-lg w-full text-center flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4">
        <img src="/isologo.png" alt="Softwind" className="w-12 h-12 rounded-full" />
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">¡Listo!</h1>
          <p className="text-neutral-400 text-base">
            El desarrollo de <span className="text-white font-medium">{projectName}</span> está completado.
          </p>
        </div>
      </div>

      {websiteUrl && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-neutral-500 uppercase tracking-widest">Tu sitio está publicado en</p>
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg text-indigo-400 hover:text-indigo-300 transition font-medium break-all"
          >
            {websiteUrl.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 pt-4 border-t border-neutral-800 w-full">
        <p className="text-sm text-neutral-400">¿Tenés alguna consulta?</p>
        <a
          href="https://wa.me/5491170661032"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-full transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.12 1.519 5.854L.057 23.882a.5.5 0 0 0 .61.61l6.083-1.456A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.933 0-3.737-.516-5.29-1.415l-.38-.22-3.613.864.876-3.546-.24-.389A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Escribinos al WhatsApp
        </a>
        <p className="text-xs text-neutral-600">+54 9 11 7066-1032</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run the full test suite**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run 2>&1 | tail -10
```

Expected: same results as before.

- [ ] **Step 4: Commit**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && git add app/completed/layout.tsx app/completed/page.tsx && git commit -m "feat: add /completed route for clients without maintenance plan"
```

---

### Task 8: Update project-status API to accept new status values

**Files:**
- Modify: `app/api/project-status/route.ts`

- [ ] **Step 1: Update VALID_STATUSES in the route**

In `app/api/project-status/route.ts`, line 6 currently reads:

```typescript
const VALID_STATUSES: ProjectStatus[] = ['pago_recibido', 'en_desarrollo', 'esperando_feedback', 'entregado']
```

Replace it with:

```typescript
const VALID_STATUSES: ProjectStatus[] = [
  'pago_recibido',
  'en_desarrollo',
  'esperando_feedback',
  'entregado',
  'entregado_sin_mantenimiento',
  'entregado_con_mantenimiento',
]
```

- [ ] **Step 2: Run the existing project-status tests**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run __tests__/api/project-status.test.ts 2>&1 | tail -10
```

Expected: all existing tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && git add app/api/project-status/route.ts && git commit -m "feat: accept new maintenance delivery statuses in project-status API"
```

---

### Task 9: Admin ProjectStatusSelector — maintenance bifurcation

**Files:**
- Modify: `components/admin/ProjectStatusSelector.tsx`
- Modify: `__tests__/components/admin/ProjectStatusSelector.test.tsx`

- [ ] **Step 1: Add failing tests for the new delivery paths**

Read `__tests__/components/admin/ProjectStatusSelector.test.tsx` and append these tests (keep all existing tests):

```tsx
  it('shows two delivery buttons when entregado_sin_mantenimiento selected', async () => {
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="en_desarrollo"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'entregado_sin_mantenimiento' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sin mantenimiento/i })).toBeTruthy()
      expect(screen.getByRole('button', { name: /con mantenimiento/i })).toBeTruthy()
    })
  })

  it('calls fetch with entregado_sin_mantenimiento and production stage on confirm', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="en_desarrollo"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'entregado_sin_mantenimiento' } })
    await waitFor(() => screen.getByRole('button', { name: /sin mantenimiento/i }))
    fireEvent.click(screen.getByRole('button', { name: /sin mantenimiento/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/project-status', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ clientId: 'c-1', project_status: 'entregado_sin_mantenimiento', stage: 'production' }),
      }))
    })
  })

  it('calls fetch with entregado_con_mantenimiento and production stage on confirm', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="en_desarrollo"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'entregado_sin_mantenimiento' } })
    await waitFor(() => screen.getByRole('button', { name: /con mantenimiento/i }))
    fireEvent.click(screen.getByRole('button', { name: /con mantenimiento/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/project-status', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ clientId: 'c-1', project_status: 'entregado_con_mantenimiento', stage: 'production' }),
      }))
    })
  })
```

- [ ] **Step 2: Run tests to confirm new tests fail**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run __tests__/components/admin/ProjectStatusSelector.test.tsx 2>&1 | tail -15
```

Expected: 3 new tests FAIL.

- [ ] **Step 3: Replace components/admin/ProjectStatusSelector.tsx**

```tsx
'use client'
import { useState, useEffect } from 'react'
import type { ProjectStatus, ProjectStage } from '@/lib/types'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pago_recibido: 'Pago recibido',
  en_desarrollo: 'En desarrollo',
  esperando_feedback: 'Esperando feedback',
  entregado: 'Entregado (legacy)',
  entregado_sin_mantenimiento: 'Listo sin mantenimiento',
  entregado_con_mantenimiento: 'Listo con mantenimiento',
}

const SELECTABLE_STATUSES: ProjectStatus[] = [
  'pago_recibido',
  'en_desarrollo',
  'esperando_feedback',
  'entregado_sin_mantenimiento',
]

interface Props {
  clientId: string
  currentStatus: ProjectStatus
  currentStage: ProjectStage
  onUpdate: (status: ProjectStatus, stage: ProjectStage) => void
}

export default function ProjectStatusSelector({ clientId, currentStatus, currentStage, onUpdate }: Props) {
  const [status, setStatus] = useState<ProjectStatus>(currentStatus)
  const [stage, setStage] = useState<ProjectStage>(currentStage)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelivery, setPendingDelivery] = useState(false)

  useEffect(() => { setStatus(currentStatus) }, [currentStatus])
  useEffect(() => { setStage(currentStage) }, [currentStage])

  async function applyStatus(newStatus: ProjectStatus, newStage: ProjectStage) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/project-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, project_status: newStatus, stage: newStage }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      setStatus(newStatus)
      setStage(newStage)
      onUpdate(newStatus, newStage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
      setPendingDelivery(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as ProjectStatus
    if (newStatus === 'entregado_sin_mantenimiento') {
      // Show bifurcation dialog — don't apply yet
      setPendingDelivery(true)
    } else {
      setPendingDelivery(false)
      applyStatus(newStatus, stage)
    }
  }

  // Determine which value to show in the select
  const selectValue = pendingDelivery ? 'entregado_sin_mantenimiento' : status

  // Show legacy entregado in select only if that's the current value
  const options = status === 'entregado'
    ? [...SELECTABLE_STATUSES, 'entregado' as ProjectStatus]
    : SELECTABLE_STATUSES

  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-2">Estado del proyecto</label>
      <select
        value={selectValue}
        onChange={handleChange}
        disabled={saving}
        className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
      >
        {options.map(s => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      {saving && <p className="text-xs text-neutral-500 mt-1">Guardando...</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      {pendingDelivery && (
        <div className="mt-4 p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
          <p className="text-sm text-amber-300 font-medium mb-1">Elegir tipo de entrega</p>
          <p className="text-xs text-amber-400 mb-4">
            El cliente pasará a <strong>Producción</strong>. Elegí qué acceso tendrá.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => applyStatus('entregado_sin_mantenimiento', 'production')}
              disabled={saving}
              aria-label="Sin mantenimiento"
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-medium rounded-lg transition text-left disabled:opacity-50"
            >
              <span className="block font-semibold mb-0.5">Sin mantenimiento</span>
              <span className="text-neutral-400">El cliente ve la pantalla de "¡Listo!" únicamente.</span>
            </button>
            <button
              onClick={() => applyStatus('entregado_con_mantenimiento', 'production')}
              disabled={saving}
              aria-label="Con mantenimiento"
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition text-left disabled:opacity-50"
            >
              <span className="block font-semibold mb-0.5">Con mantenimiento</span>
              <span className="text-indigo-300">Acceso completo: CMS, Analytics, Pedidos y Onboarding.</span>
            </button>
            <button
              onClick={() => setPendingDelivery(false)}
              className="text-xs text-neutral-500 hover:text-neutral-300 mt-1 transition text-left"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run all tests**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && npx vitest run 2>&1 | tail -15
```

Expected: All tests pass (pre-existing Framer failure acceptable). If the existing `'renders all status options'` test fails because `'Entregado y publicado'` is no longer in the list, update that test to expect `'Listo sin mantenimiento'` instead.

- [ ] **Step 5: Commit**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients && git add components/admin/ProjectStatusSelector.tsx __tests__/components/admin/ProjectStatusSelector.test.tsx && git commit -m "feat: split delivery into sin/con mantenimiento in admin status selector"
```

---

> All 9 tasks complete. Run `npx vitest run` to confirm the full suite passes before pushing.
