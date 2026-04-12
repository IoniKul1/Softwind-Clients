# Client Stages: Development & Production — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-stage client lifecycle (Development → Production) with an onboarding panel for branding asset collection and a project status timeline.

**Architecture:** New columns on the `projects` table (`stage`, `project_status`, `onboarding_data`, `admin_notes`, `meeting_file_url`) drive stage-aware middleware routing and UI. Clients in Development see an onboarding panel; clients in Production see the existing CMS/analytics/requests. Admin controls the timeline and transitions.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + RLS), Cloudflare R2 via presigned URLs, Vitest + React Testing Library, Tailwind CSS, TypeScript.

---

## File Map

**New files:**
- `supabase/migrations/add_client_stages.sql`
- `lib/onboarding.ts` — section config + completion helper
- `app/api/onboarding/route.ts`
- `app/api/project-status/route.ts`
- `app/onboarding/layout.tsx`
- `app/onboarding/page.tsx`
- `app/onboarding/[section]/page.tsx`
- `app/admin/clients/[id]/onboarding/page.tsx`
- `components/onboarding/ProjectTimeline.tsx`
- `components/onboarding/OnboardingChecklist.tsx`
- `components/onboarding/OnboardingFileUpload.tsx`
- `components/onboarding/OnboardingSection.tsx`
- `components/admin/ProjectStatusSelector.tsx`
- `components/admin/AdminOnboardingTab.tsx`
- `__tests__/lib/onboarding.test.ts`
- `__tests__/api/onboarding.test.ts`
- `__tests__/api/project-status.test.ts`
- `__tests__/components/onboarding/ProjectTimeline.test.tsx`
- `__tests__/components/onboarding/OnboardingChecklist.test.tsx`

**Modified files:**
- `lib/types.ts` — add `ProjectStage`, `ProjectStatus`, `OnboardingData`, extend `Project`
- `middleware.ts` — stage-aware routing for clients
- `components/ClientSidebar.tsx` — accept `stage` prop, show stage-appropriate nav
- `app/collections/layout.tsx` — pass `stage='production'` to sidebar
- `app/analytics/layout.tsx` — pass `stage='production'` to sidebar
- `app/requests/layout.tsx` — pass `stage='production'` to sidebar
- `components/AdminSidebar.tsx` — add Onboarding sub-link per client

---

## Task 1: DB Migration & TypeScript Types

**Files:**
- Create: `supabase/migrations/add_client_stages.sql`
- Modify: `lib/types.ts`
- Create: `lib/onboarding.ts`
- Test: `__tests__/lib/onboarding.test.ts`

- [ ] **Step 1: Write the failing test for `isSectionComplete`**

```typescript
// __tests__/lib/onboarding.test.ts
import { describe, it, expect } from 'vitest'
import { isSectionComplete, ONBOARDING_SECTIONS } from '@/lib/onboarding'
import type { OnboardingData } from '@/lib/types'

describe('isSectionComplete', () => {
  it('returns false when section is missing', () => {
    expect(isSectionComplete({}, 'brand')).toBe(false)
  })

  it('returns false when brand has no fields filled', () => {
    const data: OnboardingData = { brand: {} }
    expect(isSectionComplete(data, 'brand')).toBe(false)
  })

  it('returns true when brand has at least one field filled', () => {
    const data: OnboardingData = { brand: { logo_url: 'https://example.com/logo.png' } }
    expect(isSectionComplete(data, 'brand')).toBe(true)
  })

  it('returns false for empty colors array', () => {
    const data: OnboardingData = { colors: [] }
    expect(isSectionComplete(data, 'colors')).toBe(false)
  })

  it('returns true for non-empty colors array', () => {
    const data: OnboardingData = { colors: [{ name: 'Primario', hex: '#6366f1' }] }
    expect(isSectionComplete(data, 'colors')).toBe(true)
  })

  it('returns false for empty references array', () => {
    const data: OnboardingData = { references: [] }
    expect(isSectionComplete(data, 'references')).toBe(false)
  })

  it('returns true for non-empty references array', () => {
    const data: OnboardingData = { references: [{ url: 'https://example.com' }] }
    expect(isSectionComplete(data, 'references')).toBe(true)
  })

  it('returns true for previous_site marked as N/A', () => {
    const data: OnboardingData = { previous_site: { na: true } }
    expect(isSectionComplete(data, 'previous_site')).toBe(true)
  })

  it('returns true for previous_site with url', () => {
    const data: OnboardingData = { previous_site: { url: 'https://old-site.com' } }
    expect(isSectionComplete(data, 'previous_site')).toBe(true)
  })

  it('returns false for previous_site with no fields', () => {
    const data: OnboardingData = { previous_site: {} }
    expect(isSectionComplete(data, 'previous_site')).toBe(false)
  })

  it('ONBOARDING_SECTIONS has 7 entries', () => {
    expect(ONBOARDING_SECTIONS).toHaveLength(7)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --reporter=verbose __tests__/lib/onboarding.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/onboarding'`

- [ ] **Step 3: Create the SQL migration**

```sql
-- supabase/migrations/add_client_stages.sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'development'
    CHECK (stage IN ('development', 'production')),
  ADD COLUMN IF NOT EXISTS project_status text NOT NULL DEFAULT 'pago_recibido'
    CHECK (project_status IN ('pago_recibido', 'en_desarrollo', 'esperando_feedback', 'entregado')),
  ADD COLUMN IF NOT EXISTS onboarding_data jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS meeting_file_url text;
```

Run this migration in your Supabase dashboard (SQL Editor) or via CLI:
```bash
# If using Supabase CLI:
supabase db push
# Or paste the SQL directly in the Supabase dashboard → SQL Editor
```

- [ ] **Step 4: Update `lib/types.ts` — add new types**

Add the following to `lib/types.ts` after the existing imports, before the `Profile` interface:

```typescript
export type ProjectStage = 'development' | 'production'

export type ProjectStatus =
  | 'pago_recibido'
  | 'en_desarrollo'
  | 'esperando_feedback'
  | 'entregado'

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
```

Then extend the `Project` interface:

```typescript
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
  admin_notes?: string
  meeting_file_url?: string
}
```

- [ ] **Step 5: Create `lib/onboarding.ts`**

```typescript
// lib/onboarding.ts
import type { OnboardingData } from '@/lib/types'

export const ONBOARDING_SECTIONS: Array<{ key: keyof OnboardingData; label: string }> = [
  { key: 'brand', label: 'Identidad de Marca' },
  { key: 'typography', label: 'Tipografías' },
  { key: 'colors', label: 'Paleta de Colores' },
  { key: 'references', label: 'Referencias Visuales' },
  { key: 'previous_site', label: 'Sitio Web Anterior' },
  { key: 'content', label: 'Contenido y Copy' },
  { key: 'business', label: 'Info del Negocio' },
]

export function isSectionComplete(data: OnboardingData, key: keyof OnboardingData): boolean {
  const section = data[key]
  if (section === undefined || section === null) return false

  if (key === 'colors' || key === 'references') {
    return (section as unknown[]).length > 0
  }

  if (key === 'previous_site') {
    const ps = section as { na?: boolean; url?: string }
    return ps.na === true || (!!ps.url && ps.url.trim() !== '')
  }

  // For object sections: at least one non-empty value
  const values = Object.values(section as Record<string, unknown>)
  return values.some(v => v !== undefined && v !== null && v !== '')
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose __tests__/lib/onboarding.test.ts
```

Expected: All 11 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/add_client_stages.sql lib/types.ts lib/onboarding.ts __tests__/lib/onboarding.test.ts
git commit -m "feat: add project stage types, DB migration, and onboarding helpers"
```

---

## Task 2: API Route — PATCH /api/onboarding

**Files:**
- Create: `app/api/onboarding/route.ts`
- Test: `__tests__/api/onboarding.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/api/onboarding.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/onboarding/route'
import { NextRequest } from 'next/server'

// Mock Supabase server client
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
  })),
}))

// Mock admin client
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

  it('returns 200 and merges section data on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { onboarding_data: { colors: [] } }, error: null })
    const res = await PATCH(makeRequest({ section: 'brand', data: { logo_url: 'https://x.com/logo.png' } }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose __tests__/api/onboarding.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/onboarding/route'`

- [ ] **Step 3: Create the API route**

```typescript
// app/api/onboarding/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    .select('onboarding_data')
    .eq('client_user_id', user.id)
    .single()

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const current = (project.onboarding_data as Record<string, unknown>) ?? {}
  const updated = { ...current, [section]: data }

  const { error: updateError } = await adminClient
    .from('projects')
    .update({ onboarding_data: updated })
    .eq('client_user_id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --reporter=verbose __tests__/api/onboarding.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/onboarding/route.ts __tests__/api/onboarding.test.ts
git commit -m "feat: add PATCH /api/onboarding route for client section saves"
```

---

## Task 3: API Route — PATCH /api/project-status

**Files:**
- Create: `app/api/project-status/route.ts`
- Test: `__tests__/api/project-status.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/api/project-status.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/project-status/route'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
  })),
}))

const mockAdminUpdate = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockAdminUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
  })),
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/project-status', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const adminUser = { id: 'admin-1', app_metadata: { role: 'admin' } }
const clientUser = { id: 'client-1', app_metadata: { role: 'client' } }

describe('PATCH /api/project-status', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(makeRequest({ clientId: 'x' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: clientUser } })
    const res = await PATCH(makeRequest({ clientId: 'x' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when clientId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } })
    const res = await PATCH(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid project_status', async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } })
    const res = await PATCH(makeRequest({ clientId: 'x', project_status: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid stage', async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } })
    const res = await PATCH(makeRequest({ clientId: 'x', stage: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('updates project_status successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } })
    const res = await PATCH(makeRequest({ clientId: 'c-1', project_status: 'en_desarrollo' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('updates stage successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } })
    const res = await PATCH(makeRequest({ clientId: 'c-1', stage: 'production' }))
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose __tests__/api/project-status.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/project-status/route'`

- [ ] **Step 3: Create the API route**

```typescript
// app/api/project-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProjectStatus, ProjectStage } from '@/lib/types'

const VALID_STATUSES: ProjectStatus[] = ['pago_recibido', 'en_desarrollo', 'esperando_feedback', 'entregado']
const VALID_STAGES: ProjectStage[] = ['development', 'production']

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { clientId, project_status, stage } = body as {
    clientId?: string
    project_status?: ProjectStatus
    stage?: ProjectStage
  }

  if (!clientId) return NextResponse.json({ error: 'Falta clientId' }, { status: 400 })
  if (project_status && !VALID_STATUSES.includes(project_status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }
  if (stage && !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Etapa inválida' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (project_status) updates.project_status = project_status
  if (stage) updates.stage = stage

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('projects')
    .update(updates)
    .eq('client_user_id', clientId)

  if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --reporter=verbose __tests__/api/project-status.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/project-status/route.ts __tests__/api/project-status.test.ts
git commit -m "feat: add PATCH /api/project-status route for admin stage/status control"
```

---

## Task 4: Middleware — Stage-Aware Routing

**Files:**
- Modify: `middleware.ts`

No unit tests for middleware (it requires full Next.js integration environment). Verify manually after deployment.

- [ ] **Step 1: Replace `middleware.ts` with stage-aware version**

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

    const stage = project?.stage ?? 'development'

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
```

- [ ] **Step 2: Run all existing tests to confirm nothing broke**

```bash
npm test
```

Expected: All existing tests PASS.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: extend middleware with stage-aware routing for clients"
```

---

## Task 5: ClientSidebar — Stage-Aware Navigation

**Files:**
- Modify: `components/ClientSidebar.tsx`
- Modify: `app/collections/layout.tsx`
- Modify: `app/analytics/layout.tsx`
- Modify: `app/requests/layout.tsx`

- [ ] **Step 1: Update `ClientSidebar.tsx` to accept and use `stage` prop**

Replace the full file content:

```typescript
// components/ClientSidebar.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import type { ProjectStage } from '@/lib/types'

interface Props {
  name: string
  websiteUrl?: string | null
  stage: ProjectStage
}

export default function ClientSidebar({ name, websiteUrl, stage }: Props) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const domain = websiteUrl ? websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : null

  const navItem = (href: string, label: string, badge?: string) => {
    const active = pathname === href || (href !== '/collections' && href !== '/onboarding' && pathname.startsWith(href))
      || pathname === href
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
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stage === 'production' ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300 transition truncate">{domain}</span>
          </a>
        )}
        {stage === 'development' && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-400 border border-indigo-800">
            En desarrollo
          </span>
        )}
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {stage === 'development' ? (
          navItem('/onboarding', 'Mi Sitio')
        ) : (
          <>
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

- [ ] **Step 2: Update `app/collections/layout.tsx`**

```typescript
// app/collections/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientSidebar from '@/components/ClientSidebar'

export default async function CollectionsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: projectRows }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('projects').select('website_url').eq('client_user_id', user.id),
  ])

  return (
    <div className="flex min-h-screen">
      <ClientSidebar
        name={profile?.name ?? 'Cliente'}
        websiteUrl={projectRows?.[0]?.website_url ?? null}
        stage="production"
      />
      <main className="flex-1 px-4 py-6 pt-20 md:px-10 md:py-10 md:pt-10 min-w-0">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Update `app/analytics/layout.tsx` and `app/requests/layout.tsx`**

Both files follow the same pattern as `collections/layout.tsx`. In each file, find the `<ClientSidebar` JSX line and add the `stage="production"` prop. Example — if the current line is:

```typescript
<ClientSidebar name={profile?.name ?? 'Cliente'} websiteUrl={...} />
```

Change it to:

```typescript
<ClientSidebar name={profile?.name ?? 'Cliente'} websiteUrl={...} stage="production" />
```

If either layout does not render `ClientSidebar`, no change is needed for that file.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: All tests PASS (TypeScript types are correct).

- [ ] **Step 5: Commit**

```bash
git add components/ClientSidebar.tsx app/collections/layout.tsx app/analytics/layout.tsx app/requests/layout.tsx
git commit -m "feat: make ClientSidebar stage-aware, show onboarding nav in development"
```

---

## Task 6: ProjectTimeline Component

**Files:**
- Create: `components/onboarding/ProjectTimeline.tsx`
- Test: `__tests__/components/onboarding/ProjectTimeline.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/components/onboarding/ProjectTimeline.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectTimeline from '@/components/onboarding/ProjectTimeline'

describe('ProjectTimeline', () => {
  it('renders all 4 step labels', () => {
    render(<ProjectTimeline status="pago_recibido" />)
    expect(screen.getByText('Pago recibido')).toBeTruthy()
    expect(screen.getByText('En desarrollo')).toBeTruthy()
    expect(screen.getByText('Esperando tu feedback')).toBeTruthy()
    expect(screen.getByText('Entregado y publicado')).toBeTruthy()
  })

  it('shows first step as active for pago_recibido', () => {
    const { container } = render(<ProjectTimeline status="pago_recibido" />)
    // Active step has indigo background
    expect(container.querySelector('.bg-indigo-500')).toBeTruthy()
  })

  it('shows completed steps with green background for en_desarrollo', () => {
    const { container } = render(<ProjectTimeline status="en_desarrollo" />)
    // First step (pago_recibido) should be done (green)
    expect(container.querySelector('.bg-green-500')).toBeTruthy()
  })

  it('renders cycle indicator for esperando_feedback when active', () => {
    render(<ProjectTimeline status="esperando_feedback" />)
    expect(screen.getByText(/Vuelve a desarrollo/)).toBeTruthy()
  })

  it('does not show cycle indicator when not on feedback step', () => {
    render(<ProjectTimeline status="en_desarrollo" />)
    expect(screen.queryByText(/Vuelve a desarrollo/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose __tests__/components/onboarding/ProjectTimeline.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/onboarding/ProjectTimeline'`

- [ ] **Step 3: Create the component**

```typescript
// components/onboarding/ProjectTimeline.tsx
import type { ProjectStatus } from '@/lib/types'

const STEPS: { key: ProjectStatus; label: string; description?: string }[] = [
  { key: 'pago_recibido', label: 'Pago recibido' },
  { key: 'en_desarrollo', label: 'En desarrollo', description: 'Estamos trabajando en tu sitio ✨' },
  { key: 'esperando_feedback', label: 'Esperando tu feedback', description: 'Revisá el avance y contanos qué ajustar' },
  { key: 'entregado', label: 'Entregado y publicado 🚀', description: 'Acceso al plan de mantenimiento' },
]

const STATUS_ORDER: ProjectStatus[] = ['pago_recibido', 'en_desarrollo', 'esperando_feedback', 'entregado']

interface Props {
  status: ProjectStatus
}

export default function ProjectTimeline({ status }: Props) {
  const activeIndex = STATUS_ORDER.indexOf(status)

  return (
    <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
      <h2 className="text-sm font-semibold text-white mb-6">Estado del Proyecto</h2>
      <div className="flex flex-col">
        {STEPS.map((step, i) => {
          const isDone = activeIndex > i
          const isActive = activeIndex === i
          return (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isDone
                    ? 'bg-green-500'
                    : isActive
                    ? 'bg-indigo-500 ring-4 ring-indigo-500/20'
                    : 'bg-neutral-800 border border-neutral-700'
                }`}>
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-600'}`}>
                      {i + 1}
                    </span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-0.5 h-10 mt-1 ${isDone ? 'bg-green-500' : 'bg-neutral-800'}`} />
                )}
              </div>
              <div className="pb-8 pt-1">
                <p className={`text-sm font-medium ${
                  isDone ? 'text-neutral-500' : isActive ? 'text-white' : 'text-neutral-600'
                }`}>
                  {step.label}
                </p>
                {step.description && isActive && (
                  <p className="text-xs text-neutral-500 mt-0.5">{step.description}</p>
                )}
                {step.key === 'esperando_feedback' && isActive && (
                  <p className="text-[11px] text-indigo-400 mt-1.5">
                    ⇄ Vuelve a desarrollo si hay ajustes
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --reporter=verbose __tests__/components/onboarding/ProjectTimeline.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/onboarding/ProjectTimeline.tsx __tests__/components/onboarding/ProjectTimeline.test.tsx
git commit -m "feat: add ProjectTimeline component with status stepper"
```

---

## Task 7: OnboardingChecklist Component

**Files:**
- Create: `components/onboarding/OnboardingChecklist.tsx`
- Test: `__tests__/components/onboarding/OnboardingChecklist.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/components/onboarding/OnboardingChecklist.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist'
import type { OnboardingData } from '@/lib/types'

// next/link renders as <a> in tests
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}))

describe('OnboardingChecklist', () => {
  it('shows 0 of 7 when data is empty', () => {
    render(<OnboardingChecklist data={{}} />)
    expect(screen.getByText('0 de 7')).toBeTruthy()
  })

  it('shows all 7 section labels', () => {
    render(<OnboardingChecklist data={{}} />)
    expect(screen.getByText('Identidad de Marca')).toBeTruthy()
    expect(screen.getByText('Tipografías')).toBeTruthy()
    expect(screen.getByText('Paleta de Colores')).toBeTruthy()
    expect(screen.getByText('Referencias Visuales')).toBeTruthy()
    expect(screen.getByText('Sitio Web Anterior')).toBeTruthy()
    expect(screen.getByText('Contenido y Copy')).toBeTruthy()
    expect(screen.getByText('Info del Negocio')).toBeTruthy()
  })

  it('marks completed sections correctly', () => {
    const data: OnboardingData = {
      brand: { logo_url: 'https://x.com/logo.png' },
      colors: [{ name: 'Primario', hex: '#6366f1' }],
    }
    render(<OnboardingChecklist data={data} />)
    expect(screen.getByText('2 de 7')).toBeTruthy()
  })

  it('shows Completo for completed sections', () => {
    const data: OnboardingData = { brand: { logo_url: 'https://x.com/logo.png' } }
    render(<OnboardingChecklist data={data} />)
    expect(screen.getByText('✓ Completo')).toBeTruthy()
  })

  it('section links point to correct paths', () => {
    render(<OnboardingChecklist data={{}} />)
    const link = screen.getByRole('link', { name: /Identidad de Marca/ })
    expect(link.getAttribute('href')).toBe('/onboarding/brand')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose __tests__/components/onboarding/OnboardingChecklist.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/onboarding/OnboardingChecklist'`

- [ ] **Step 3: Create the component**

```typescript
// components/onboarding/OnboardingChecklist.tsx
import Link from 'next/link'
import { ONBOARDING_SECTIONS, isSectionComplete } from '@/lib/onboarding'
import type { OnboardingData } from '@/lib/types'

interface Props {
  data: OnboardingData
}

export default function OnboardingChecklist({ data }: Props) {
  const completed = ONBOARDING_SECTIONS.filter(s => isSectionComplete(data, s.key)).length
  const total = ONBOARDING_SECTIONS.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white">Tu información</h2>
        <span className="text-xs text-neutral-500">{completed} de {total}</span>
      </div>
      <div className="h-1.5 bg-neutral-800 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-col gap-2">
        {ONBOARDING_SECTIONS.map(({ key, label }) => {
          const done = isSectionComplete(data, key)
          return (
            <Link
              key={key}
              href={`/onboarding/${key}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50 transition"
            >
              <span className={`text-sm ${done ? 'text-neutral-300' : 'text-neutral-500'}`}>
                {label}
              </span>
              <span className={`text-xs font-medium ${done ? 'text-green-400' : 'text-amber-500'}`}>
                {done ? '✓ Completo' : '⏳ Pendiente'}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --reporter=verbose __tests__/components/onboarding/OnboardingChecklist.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/onboarding/OnboardingChecklist.tsx __tests__/components/onboarding/OnboardingChecklist.test.tsx
git commit -m "feat: add OnboardingChecklist component with progress tracking"
```

---

## Task 8: OnboardingFileUpload + OnboardingSection Components

**Files:**
- Create: `components/onboarding/OnboardingFileUpload.tsx`
- Create: `components/onboarding/OnboardingSection.tsx`

No unit tests for these components — they rely on `fetch` to `/api/upload-url` which is integration-level. Manual verification in Task 9.

- [ ] **Step 1: Create `OnboardingFileUpload.tsx`**

```typescript
// components/onboarding/OnboardingFileUpload.tsx
'use client'
import { useState } from 'react'

interface Props {
  label: string
  currentUrl?: string
  accept?: string
  uploadKeyPrefix: string // e.g., 'onboarding/user-id/brand/logo'
  onUploaded: (url: string) => void
}

export default function OnboardingFileUpload({ label, currentUrl, accept, uploadKeyPrefix, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const key = `${uploadKeyPrefix}/${Date.now()}.${ext}`
      const res = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type)}`)
      if (!res.ok) throw new Error('Error al obtener URL de subida')
      const { url } = await res.json()
      const uploadRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!uploadRes.ok) throw new Error('Error al subir archivo')
      const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
      onUploaded(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
      {currentUrl && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:underline block mb-2 truncate"
        >
          Archivo actual ↗
        </a>
      )}
      <input
        type="file"
        accept={accept}
        onChange={handleFile}
        disabled={uploading}
        className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-neutral-800 file:text-neutral-200 file:text-xs hover:file:bg-neutral-700 transition disabled:opacity-50"
      />
      {uploading && <p className="text-xs text-neutral-500 mt-1">Subiendo...</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create `OnboardingSection.tsx`**

This component renders the form for a specific onboarding section. It fetches the current section data from the parent via props and saves via PATCH /api/onboarding.

```typescript
// components/onboarding/OnboardingSection.tsx
'use client'
import { useState } from 'react'
import OnboardingFileUpload from './OnboardingFileUpload'
import type {
  OnboardingData, OnboardingBrand, OnboardingTypography,
  OnboardingColor, OnboardingReference, OnboardingPreviousSite,
  OnboardingContent, OnboardingBusiness,
} from '@/lib/types'

interface Props {
  sectionKey: keyof OnboardingData
  label: string
  initialData: OnboardingData
  userId: string
}

export default function OnboardingSection({ sectionKey, label, initialData, userId }: Props) {
  const [data, setData] = useState<OnboardingData>(initialData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadPrefix = `onboarding/${userId}/${sectionKey}`

  async function save(sectionData: unknown) {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: sectionKey, data: sectionData }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setData(prev => ({ ...prev, [sectionKey]: sectionData }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-white mb-6">{label}</h1>
      {sectionKey === 'brand' && (
        <BrandForm
          value={(data.brand ?? {}) as OnboardingBrand}
          uploadPrefix={uploadPrefix}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'typography' && (
        <TypographyForm
          value={(data.typography ?? {}) as OnboardingTypography}
          uploadPrefix={uploadPrefix}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'colors' && (
        <ColorsForm
          value={data.colors ?? []}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'references' && (
        <ReferencesForm
          value={data.references ?? []}
          uploadPrefix={uploadPrefix}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'previous_site' && (
        <PreviousSiteForm
          value={(data.previous_site ?? {}) as OnboardingPreviousSite}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'content' && (
        <ContentForm
          value={(data.content ?? {}) as OnboardingContent}
          uploadPrefix={uploadPrefix}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'business' && (
        <BusinessForm
          value={(data.business ?? {}) as OnboardingBusiness}
          onSave={save}
          saving={saving}
        />
      )}
      {saved && <p className="text-sm text-green-400 mt-4">✓ Guardado</p>}
      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
    </div>
  )
}

// ─── Brand ───────────────────────────────────────────────────────────────────

function BrandForm({ value, uploadPrefix, onSave, saving }: {
  value: OnboardingBrand; uploadPrefix: string; onSave: (d: unknown) => void; saving: boolean
}) {
  const [form, setForm] = useState(value)
  return (
    <div className="flex flex-col gap-5">
      <OnboardingFileUpload
        label="Logo principal (PNG preferido)"
        currentUrl={form.logo_url}
        accept="image/*"
        uploadKeyPrefix={`${uploadPrefix}/logo`}
        onUploaded={url => setForm(f => ({ ...f, logo_url: url }))}
      />
      <OnboardingFileUpload
        label="Isologo (PNG/SVG)"
        currentUrl={form.isologo_url}
        accept="image/*"
        uploadKeyPrefix={`${uploadPrefix}/isologo`}
        onUploaded={url => setForm(f => ({ ...f, isologo_url: url }))}
      />
      <OnboardingFileUpload
        label="Favicon (PNG/ICO)"
        currentUrl={form.favicon_url}
        accept="image/*,.ico"
        uploadKeyPrefix={`${uploadPrefix}/favicon`}
        onUploaded={url => setForm(f => ({ ...f, favicon_url: url }))}
      />
      <OnboardingFileUpload
        label="Brand Guide (PDF, opcional)"
        currentUrl={form.brand_guide_url}
        accept=".pdf"
        uploadKeyPrefix={`${uploadPrefix}/brand-guide`}
        onUploaded={url => setForm(f => ({ ...f, brand_guide_url: url }))}
      />
      <SaveButton onClick={() => onSave(form)} saving={saving} />
    </div>
  )
}

// ─── Typography ──────────────────────────────────────────────────────────────

function TypographyForm({ value, uploadPrefix, onSave, saving }: {
  value: OnboardingTypography; uploadPrefix: string; onSave: (d: unknown) => void; saving: boolean
}) {
  const [form, setForm] = useState(value)
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="border border-neutral-800 rounded-lg p-4 flex flex-col gap-4">
        <legend className="text-xs text-neutral-400 px-2">Tipografía de Títulos (Display)</legend>
        <TextInput label="Nombre de la fuente" value={form.display_name ?? ''} onChange={v => setForm(f => ({ ...f, display_name: v }))} placeholder="ej. Playfair Display" />
        <TextInput label="URL Google Fonts (opcional)" value={form.display_google_url ?? ''} onChange={v => setForm(f => ({ ...f, display_google_url: v }))} placeholder="https://fonts.google.com/..." />
        <OnboardingFileUpload
          label="Archivo de fuente (TTF/OTF/WOFF, opcional)"
          currentUrl={form.display_file_url}
          accept=".ttf,.otf,.woff,.woff2"
          uploadKeyPrefix={`${uploadPrefix}/display-font`}
          onUploaded={url => setForm(f => ({ ...f, display_file_url: url }))}
        />
      </fieldset>
      <fieldset className="border border-neutral-800 rounded-lg p-4 flex flex-col gap-4">
        <legend className="text-xs text-neutral-400 px-2">Tipografía de Cuerpo (Body)</legend>
        <TextInput label="Nombre de la fuente" value={form.body_name ?? ''} onChange={v => setForm(f => ({ ...f, body_name: v }))} placeholder="ej. Inter" />
        <TextInput label="URL Google Fonts (opcional)" value={form.body_google_url ?? ''} onChange={v => setForm(f => ({ ...f, body_google_url: v }))} placeholder="https://fonts.google.com/..." />
        <OnboardingFileUpload
          label="Archivo de fuente (TTF/OTF/WOFF, opcional)"
          currentUrl={form.body_file_url}
          accept=".ttf,.otf,.woff,.woff2"
          uploadKeyPrefix={`${uploadPrefix}/body-font`}
          onUploaded={url => setForm(f => ({ ...f, body_file_url: url }))}
        />
      </fieldset>
      <fieldset className="border border-neutral-800 rounded-lg p-4">
        <legend className="text-xs text-neutral-400 px-2">Tipografía de Acento / UI (opcional)</legend>
        <TextInput label="Nombre de la fuente" value={form.accent_name ?? ''} onChange={v => setForm(f => ({ ...f, accent_name: v }))} placeholder="ej. DM Mono" />
      </fieldset>
      <SaveButton onClick={() => onSave(form)} saving={saving} />
    </div>
  )
}

// ─── Colors ──────────────────────────────────────────────────────────────────

function ColorsForm({ value, onSave, saving }: {
  value: OnboardingColor[]; onSave: (d: unknown) => void; saving: boolean
}) {
  const [colors, setColors] = useState<OnboardingColor[]>(
    value.length > 0 ? value : [{ name: 'Primario', hex: '#6366f1' }]
  )

  function updateColor(i: number, field: keyof OnboardingColor, val: string) {
    setColors(cs => cs.map((c, j) => j === i ? { ...c, [field]: val } : c))
  }

  function addColor() {
    setColors(cs => [...cs, { name: '', hex: '#000000' }])
  }

  function removeColor(i: number) {
    setColors(cs => cs.filter((_, j) => j !== i))
  }

  return (
    <div className="flex flex-col gap-4">
      {colors.map((color, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border border-neutral-800 rounded-lg">
          <input
            type="color"
            value={color.hex}
            onChange={e => updateColor(i, 'hex', e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
          />
          <input
            type="text"
            value={color.hex}
            onChange={e => updateColor(i, 'hex', e.target.value)}
            placeholder="#000000"
            className="w-24 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded border border-neutral-700 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <input
            type="text"
            value={color.name}
            onChange={e => updateColor(i, 'name', e.target.value)}
            placeholder="ej. Primario"
            className="flex-1 bg-neutral-800 text-white text-sm px-3 py-1.5 rounded border border-neutral-700 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => removeColor(i)}
            className="text-neutral-600 hover:text-red-400 transition text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addColor}
        className="text-sm text-indigo-400 hover:text-indigo-300 transition text-left"
      >
        + Agregar color
      </button>
      <SaveButton onClick={() => onSave(colors)} saving={saving} />
    </div>
  )
}

// ─── References ──────────────────────────────────────────────────────────────

function ReferencesForm({ value, uploadPrefix, onSave, saving }: {
  value: OnboardingReference[]; uploadPrefix: string; onSave: (d: unknown) => void; saving: boolean
}) {
  const [refs, setRefs] = useState<OnboardingReference[]>(
    value.length > 0 ? value : [{}]
  )

  function updateRef(i: number, field: keyof OnboardingReference, val: string) {
    setRefs(rs => rs.map((r, j) => j === i ? { ...r, [field]: val } : r))
  }

  function addRef() {
    setRefs(rs => [...rs, {}])
  }

  function removeRef(i: number) {
    setRefs(rs => rs.filter((_, j) => j !== i))
  }

  return (
    <div className="flex flex-col gap-4">
      {refs.map((ref, i) => (
        <div key={i} className="p-4 border border-neutral-800 rounded-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Referencia {i + 1}</span>
            <button onClick={() => removeRef(i)} className="text-neutral-600 hover:text-red-400 transition text-sm">
              Eliminar
            </button>
          </div>
          <TextInput
            label="URL del sitio (opcional)"
            value={ref.url ?? ''}
            onChange={v => updateRef(i, 'url', v)}
            placeholder="https://ejemplo.com"
          />
          <OnboardingFileUpload
            label="Imagen / captura (opcional)"
            currentUrl={ref.image_url}
            accept="image/*"
            uploadKeyPrefix={`${uploadPrefix}/ref-${i}`}
            onUploaded={url => setRefs(rs => rs.map((r, j) => j === i ? { ...r, image_url: url } : r))}
          />
          <TextInput
            label="Nota (opcional)"
            value={ref.note ?? ''}
            onChange={v => updateRef(i, 'note', v)}
            placeholder="ej. Me gusta la navegación"
          />
        </div>
      ))}
      <button onClick={addRef} className="text-sm text-indigo-400 hover:text-indigo-300 transition text-left">
        + Agregar referencia
      </button>
      <SaveButton onClick={() => onSave(refs)} saving={saving} />
    </div>
  )
}

// ─── Previous Site ───────────────────────────────────────────────────────────

function PreviousSiteForm({ value, onSave, saving }: {
  value: OnboardingPreviousSite; onSave: (d: unknown) => void; saving: boolean
}) {
  const [form, setForm] = useState(value)

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.na ?? false}
          onChange={e => setForm(f => ({ ...f, na: e.target.checked }))}
          className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-indigo-500 focus:ring-indigo-500"
        />
        <span className="text-sm text-neutral-400">No tenemos sitio web anterior</span>
      </label>
      {!form.na && (
        <>
          <TextInput
            label="URL del sitio actual"
            value={form.url ?? ''}
            onChange={v => setForm(f => ({ ...f, url: v }))}
            placeholder="https://mi-sitio-viejo.com"
          />
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">¿Qué te gusta del sitio actual?</label>
            <textarea
              value={form.likes ?? ''}
              onChange={e => setForm(f => ({ ...f, likes: e.target.value }))}
              rows={3}
              className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="ej. Me gusta la paleta de colores..."
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">¿Qué no te gusta o querés cambiar?</label>
            <textarea
              value={form.dislikes ?? ''}
              onChange={e => setForm(f => ({ ...f, dislikes: e.target.value }))}
              rows={3}
              className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="ej. La navegación es confusa..."
            />
          </div>
        </>
      )}
      <SaveButton onClick={() => onSave(form)} saving={saving} />
    </div>
  )
}

// ─── Content ─────────────────────────────────────────────────────────────────

function ContentForm({ value, uploadPrefix, onSave, saving }: {
  value: OnboardingContent; uploadPrefix: string; onSave: (d: unknown) => void; saving: boolean
}) {
  const [form, setForm] = useState(value)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Archivos de texto / contenido (DOCX, PDF, TXT)</label>
        <input
          type="file"
          accept=".docx,.pdf,.txt,.doc"
          multiple
          onChange={async e => {
            const files = Array.from(e.target.files ?? [])
            const uploaded: Array<{ url: string; name: string }> = []
            for (const file of files) {
              const ext = file.name.split('.').pop() ?? 'bin'
              const key = `${uploadPrefix}/content/${Date.now()}-${file.name}`
              const res = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type)}`)
              const { url } = await res.json()
              await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
              uploaded.push({ url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`, name: file.name })
            }
            setForm(f => ({ ...f, files: [...(f.files ?? []), ...uploaded] }))
          }}
          className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-neutral-800 file:text-neutral-200 file:text-xs hover:file:bg-neutral-700 transition"
        />
        {(form.files ?? []).length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {(form.files ?? []).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-neutral-400">
                <span>📄</span>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition truncate">{f.name}</a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Notas adicionales</label>
        <textarea
          value={form.notes ?? ''}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={4}
          className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
          placeholder="ej. El texto del About está en el documento, las fotos las mandamos por drive..."
        />
      </div>
      <SaveButton onClick={() => onSave(form)} saving={saving} />
    </div>
  )
}

// ─── Business ────────────────────────────────────────────────────────────────

function BusinessForm({ value, onSave, saving }: {
  value: OnboardingBusiness; onSave: (d: unknown) => void; saving: boolean
}) {
  const [form, setForm] = useState(value)
  const [competitorInput, setCompetitorInput] = useState('')

  function addCompetitor() {
    if (!competitorInput.trim()) return
    setForm(f => ({ ...f, competitors: [...(f.competitors ?? []), competitorInput.trim()] }))
    setCompetitorInput('')
  }

  function removeCompetitor(i: number) {
    setForm(f => ({ ...f, competitors: (f.competitors ?? []).filter((_, j) => j !== i) }))
  }

  return (
    <div className="flex flex-col gap-5">
      <TextInput label="Rubro / industria" value={form.industry ?? ''} onChange={v => setForm(f => ({ ...f, industry: v }))} placeholder="ej. Arquitectura, Moda, Tecnología..." />
      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Público objetivo</label>
        <textarea
          value={form.audience ?? ''}
          onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
          rows={3}
          className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
          placeholder="ej. Profesionales de 30-45 años en LATAM..."
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Competidores (URLs)</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={competitorInput}
            onChange={e => setCompetitorInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCompetitor())}
            placeholder="https://competidor.com"
            className="flex-1 bg-neutral-800 text-white text-sm px-3 py-1.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
          />
          <button onClick={addCompetitor} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg transition">
            +
          </button>
        </div>
        {(form.competitors ?? []).map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
            <span className="truncate flex-1">{c}</span>
            <button onClick={() => removeCompetitor(i)} className="text-neutral-600 hover:text-red-400 transition">×</button>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-2">Redes sociales</label>
        <div className="flex flex-col gap-2">
          {['instagram', 'linkedin', 'facebook', 'twitter'].map(net => (
            <div key={net} className="flex items-center gap-2">
              <span className="text-xs text-neutral-600 w-20 capitalize">{net}</span>
              <input
                type="text"
                value={(form.social ?? {})[net] ?? ''}
                onChange={e => setForm(f => ({ ...f, social: { ...(f.social ?? {}), [net]: e.target.value } }))}
                placeholder={`@usuario o URL`}
                className="flex-1 bg-neutral-800 text-white text-sm px-3 py-1.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
      </div>
      <TextInput
        label="Tono de voz"
        value={form.tone ?? ''}
        onChange={v => setForm(f => ({ ...f, tone: v }))}
        placeholder="ej. Formal y profesional, Cercano y amigable, Técnico..."
      />
      <SaveButton onClick={() => onSave(form)} saving={saving} />
    </div>
  )
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function TextInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
      />
    </div>
  )
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="self-start px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
    >
      {saving ? 'Guardando...' : 'Guardar'}
    </button>
  )
}
```

- [ ] **Step 3: Run all tests to confirm no regressions**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add components/onboarding/OnboardingFileUpload.tsx components/onboarding/OnboardingSection.tsx
git commit -m "feat: add OnboardingFileUpload and OnboardingSection components for all 7 sections"
```

---

## Task 9: Client Onboarding Pages & Layout

**Files:**
- Create: `app/onboarding/layout.tsx`
- Create: `app/onboarding/page.tsx`
- Create: `app/onboarding/[section]/page.tsx`

- [ ] **Step 1: Create `app/onboarding/layout.tsx`**

```typescript
// app/onboarding/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientSidebar from '@/components/ClientSidebar'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: projectRows }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('projects').select('website_url').eq('client_user_id', user.id),
  ])

  return (
    <div className="flex min-h-screen">
      <ClientSidebar
        name={profile?.name ?? 'Cliente'}
        websiteUrl={projectRows?.[0]?.website_url ?? null}
        stage="development"
      />
      <main className="flex-1 px-4 py-6 pt-20 md:px-10 md:py-10 md:pt-10 min-w-0">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/onboarding/page.tsx`**

```typescript
// app/onboarding/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectTimeline from '@/components/onboarding/ProjectTimeline'
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist'
import type { ProjectStatus, OnboardingData } from '@/lib/types'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('project_status, onboarding_data')
    .eq('client_user_id', user.id)
    .single()

  const status = (project?.project_status ?? 'pago_recibido') as ProjectStatus
  const onboardingData = (project?.onboarding_data ?? {}) as OnboardingData

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-2">Bienvenido</h1>
      <p className="text-neutral-500 text-sm mb-8">
        Estamos construyendo tu sitio. Completá tu información para ayudarnos a diseñarlo.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectTimeline status={status} />
        <OnboardingChecklist data={onboardingData} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/onboarding/[section]/page.tsx`**

```typescript
// app/onboarding/[section]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import OnboardingSection from '@/components/onboarding/OnboardingSection'
import { ONBOARDING_SECTIONS } from '@/lib/onboarding'
import type { OnboardingData } from '@/lib/types'

export default async function OnboardingSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  const sectionConfig = ONBOARDING_SECTIONS.find(s => s.key === section)
  if (!sectionConfig) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('onboarding_data')
    .eq('client_user_id', user.id)
    .single()

  const onboardingData = (project?.onboarding_data ?? {}) as OnboardingData

  return (
    <div>
      <a href="/onboarding" className="text-xs text-neutral-500 hover:text-neutral-300 transition mb-6 block">
        ← Volver al panel
      </a>
      <OnboardingSection
        sectionKey={sectionConfig.key}
        label={sectionConfig.label}
        initialData={onboardingData}
        userId={user.id}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/onboarding/layout.tsx app/onboarding/page.tsx app/onboarding/[section]/page.tsx
git commit -m "feat: add client onboarding pages (home, layout, section forms)"
```

---

## Task 10: Admin — ProjectStatusSelector Component

**Files:**
- Create: `components/admin/ProjectStatusSelector.tsx`
- Test: `__tests__/components/admin/ProjectStatusSelector.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/components/admin/ProjectStatusSelector.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProjectStatusSelector from '@/components/admin/ProjectStatusSelector'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ProjectStatusSelector', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders current status label', () => {
    const onUpdate = vi.fn()
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="en_desarrollo"
        currentStage="development"
        onUpdate={onUpdate}
      />
    )
    expect(screen.getByText('En desarrollo')).toBeTruthy()
  })

  it('renders all status options', () => {
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="pago_recibido"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    expect(screen.getByText('Pago recibido')).toBeTruthy()
    expect(screen.getByText('En desarrollo')).toBeTruthy()
    expect(screen.getByText('Esperando feedback')).toBeTruthy()
    expect(screen.getByText('Entregado y publicado')).toBeTruthy()
  })

  it('calls fetch on status change', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const onUpdate = vi.fn()
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="pago_recibido"
        currentStage="development"
        onUpdate={onUpdate}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'en_desarrollo' } })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      '/api/project-status',
      expect.objectContaining({ method: 'PATCH' })
    ))
  })

  it('shows confirmation dialog before switching to entregado', () => {
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="esperando_feedback"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'entregado' } })
    expect(screen.getByText(/Marcar como entregado/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose __tests__/components/admin/ProjectStatusSelector.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/admin/ProjectStatusSelector'`

- [ ] **Step 3: Create the component**

```typescript
// components/admin/ProjectStatusSelector.tsx
'use client'
import { useState } from 'react'
import type { ProjectStatus, ProjectStage } from '@/lib/types'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pago_recibido: 'Pago recibido',
  en_desarrollo: 'En desarrollo',
  esperando_feedback: 'Esperando feedback',
  entregado: 'Entregado y publicado',
}

const ALL_STATUSES: ProjectStatus[] = ['pago_recibido', 'en_desarrollo', 'esperando_feedback', 'entregado']

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
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null)

  async function applyStatus(newStatus: ProjectStatus, newStage: ProjectStage) {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { clientId, project_status: newStatus }
      if (newStage !== stage) body.stage = newStage
      const res = await fetch('/api/project-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      setStatus(newStatus)
      setStage(newStage)
      onUpdate(newStatus, newStage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
      setPendingStatus(null)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as ProjectStatus
    if (newStatus === 'entregado') {
      // Require confirmation before transitioning to production
      setPendingStatus(newStatus)
    } else {
      applyStatus(newStatus, 'development')
    }
  }

  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-2">Estado del proyecto</label>
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
      >
        {ALL_STATUSES.map(s => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      {saving && <p className="text-xs text-neutral-500 mt-1">Guardando...</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      {/* Confirmation dialog for entregado */}
      {pendingStatus === 'entregado' && (
        <div className="mt-4 p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
          <p className="text-sm text-amber-300 font-medium mb-2">
            Marcar como entregado y pasar a Producción
          </p>
          <p className="text-xs text-amber-400 mb-4">
            Esto cambiará la etapa del cliente a <strong>Producción</strong>.
            El cliente perderá acceso al panel de onboarding y verá el CMS, analytics y pedidos de cambios.
            ¿Confirmás?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => applyStatus('entregado', 'production')}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition"
            >
              Sí, confirmar entrega
            </button>
            <button
              onClick={() => setPendingStatus(null)}
              className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition"
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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --reporter=verbose __tests__/components/admin/ProjectStatusSelector.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/admin/ProjectStatusSelector.tsx __tests__/components/admin/ProjectStatusSelector.test.tsx
git commit -m "feat: add ProjectStatusSelector admin component with delivery confirmation"
```

---

## Task 11: Admin — AdminOnboardingTab Component

**Files:**
- Create: `components/admin/AdminOnboardingTab.tsx`

No unit tests — this is a composite read-only display component. Verified manually in Task 12.

- [ ] **Step 1: Create `AdminOnboardingTab.tsx`**

```typescript
// components/admin/AdminOnboardingTab.tsx
'use client'
import { useState } from 'react'
import ProjectStatusSelector from './ProjectStatusSelector'
import { ONBOARDING_SECTIONS, isSectionComplete } from '@/lib/onboarding'
import type { ProjectStatus, ProjectStage, OnboardingData } from '@/lib/types'

interface ProjectData {
  id: string
  stage: ProjectStage
  project_status: ProjectStatus
  onboarding_data: OnboardingData
  admin_notes?: string
  meeting_file_url?: string
}

interface Props {
  clientId: string
  project: ProjectData
}

export default function AdminOnboardingTab({ clientId, project }: Props) {
  const [status, setStatus] = useState<ProjectStatus>(project.project_status)
  const [stage, setStage] = useState<ProjectStage>(project.stage)
  const [adminNotes, setAdminNotes] = useState(project.admin_notes ?? '')
  const [meetingFileUrl, setMeetingFileUrl] = useState(project.meeting_file_url ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savedNotes, setSavedNotes] = useState(false)
  const [uploadingMeeting, setUploadingMeeting] = useState(false)
  const data = project.onboarding_data

  async function saveAdminNotes() {
    setSavingNotes(true)
    setSavedNotes(false)
    await fetch('/api/project-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, admin_notes: adminNotes }),
    })
    setSavingNotes(false)
    setSavedNotes(true)
    setTimeout(() => setSavedNotes(false), 3000)
  }

  async function handleMeetingUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingMeeting(true)
    const ext = file.name.split('.').pop() ?? 'bin'
    const key = `onboarding/admin/${clientId}/meeting/${Date.now()}.${ext}`
    const res = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type)}`)
    const { url } = await res.json()
    await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
    setMeetingFileUrl(publicUrl)
    await fetch('/api/project-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, meeting_file_url: publicUrl }),
    })
    setUploadingMeeting(false)
  }

  const completed = ONBOARDING_SECTIONS.filter(s => isSectionComplete(data, s.key)).length

  return (
    <div className="flex flex-col gap-8 max-w-3xl">

      {/* Status Control */}
      <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
        <h2 className="text-sm font-semibold text-white mb-4">Control de Estado</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ProjectStatusSelector
            clientId={clientId}
            currentStatus={status}
            currentStage={stage}
            onUpdate={(s, g) => { setStatus(s); setStage(g) }}
          />
          <div>
            <p className="text-xs text-neutral-400 mb-2">Etapa actual</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              stage === 'development'
                ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-800'
                : 'bg-green-900/50 text-green-400 border border-green-800'
            }`}>
              {stage === 'development' ? 'Desarrollo' : 'Producción'}
            </span>
          </div>
        </div>
      </div>

      {/* Client Onboarding Progress */}
      <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Información del Cliente</h2>
          <span className="text-xs text-neutral-500">{completed} de {ONBOARDING_SECTIONS.length} secciones</span>
        </div>
        <div className="h-1.5 bg-neutral-800 rounded-full mb-5 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full"
            style={{ width: `${Math.round((completed / ONBOARDING_SECTIONS.length) * 100)}%` }}
          />
        </div>
        <div className="flex flex-col gap-3">
          {ONBOARDING_SECTIONS.map(({ key, label }) => {
            const done = isSectionComplete(data, key)
            const sectionData = data[key]
            return (
              <div key={key} className={`p-3 rounded-lg border ${done ? 'border-neutral-700 bg-neutral-800/50' : 'border-neutral-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-300">{label}</span>
                  <span className={`text-xs ${done ? 'text-green-400' : 'text-neutral-600'}`}>
                    {done ? '✓ Completado' : 'Pendiente'}
                  </span>
                </div>
                {done && sectionData && (
                  <pre className="text-xs text-neutral-500 overflow-auto max-h-24 whitespace-pre-wrap">
                    {JSON.stringify(sectionData, null, 2)}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Admin-only: Meeting Transcript */}
      <div className="bg-indigo-950/30 rounded-xl p-6 border border-indigo-900">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded font-medium">Solo Admin</span>
          <h2 className="text-sm font-semibold text-white">Transcript de Reunión</h2>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Archivo de reunión (PDF, DOCX, TXT, MP3)</label>
            {meetingFileUrl && (
              <a href={meetingFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline block mb-2">
                Ver archivo actual ↗
              </a>
            )}
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.mp3,.mp4"
              onChange={handleMeetingUpload}
              disabled={uploadingMeeting}
              className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-neutral-800 file:text-neutral-200 file:text-xs hover:file:bg-neutral-700 transition disabled:opacity-50"
            />
            {uploadingMeeting && <p className="text-xs text-neutral-500 mt-1">Subiendo...</p>}
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Notas internas</label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={5}
              className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Notas de la reunión, acuerdos, puntos importantes..."
            />
          </div>
          <button
            onClick={saveAdminNotes}
            disabled={savingNotes}
            className="self-start px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {savingNotes ? 'Guardando...' : 'Guardar notas'}
          </button>
          {savedNotes && <p className="text-xs text-green-400">✓ Guardado</p>}
        </div>
      </div>

    </div>
  )
}
```

- [ ] **Step 2: Update `PATCH /api/project-status` to also accept `admin_notes` and `meeting_file_url`**

The current route only accepts `project_status` and `stage`. Add support for admin-only fields. Modify `app/api/project-status/route.ts`:

```typescript
// app/api/project-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProjectStatus, ProjectStage } from '@/lib/types'

const VALID_STATUSES: ProjectStatus[] = ['pago_recibido', 'en_desarrollo', 'esperando_feedback', 'entregado']
const VALID_STAGES: ProjectStage[] = ['development', 'production']

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { clientId, project_status, stage, admin_notes, meeting_file_url } = body as {
    clientId?: string
    project_status?: ProjectStatus
    stage?: ProjectStage
    admin_notes?: string
    meeting_file_url?: string
  }

  if (!clientId) return NextResponse.json({ error: 'Falta clientId' }, { status: 400 })
  if (project_status && !VALID_STATUSES.includes(project_status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }
  if (stage && !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Etapa inválida' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (project_status !== undefined) updates.project_status = project_status
  if (stage !== undefined) updates.stage = stage
  if (admin_notes !== undefined) updates.admin_notes = admin_notes
  if (meeting_file_url !== undefined) updates.meeting_file_url = meeting_file_url

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('projects')
    .update(updates)
    .eq('client_user_id', clientId)

  if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: All tests PASS. (The existing project-status tests still pass since they don't test the new fields.)

- [ ] **Step 4: Commit**

```bash
git add components/admin/AdminOnboardingTab.tsx app/api/project-status/route.ts
git commit -m "feat: add AdminOnboardingTab with client data view, notes, and meeting upload"
```

---

## Task 12: Admin Onboarding Page & AdminSidebar Link

**Files:**
- Create: `app/admin/clients/[id]/onboarding/page.tsx`
- Modify: `components/AdminSidebar.tsx`

- [ ] **Step 1: Create `app/admin/clients/[id]/onboarding/page.tsx`**

```typescript
// app/admin/clients/[id]/onboarding/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import AdminOnboardingTab from '@/components/admin/AdminOnboardingTab'
import type { ProjectStatus, ProjectStage, OnboardingData } from '@/lib/types'

export default async function AdminOnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { data: project } = await adminClient
    .from('projects')
    .select('id, stage, project_status, onboarding_data, admin_notes, meeting_file_url')
    .eq('client_user_id', id)
    .single()

  if (!project) notFound()

  return (
    <AdminOnboardingTab
      clientId={id}
      project={{
        id: project.id,
        stage: project.stage as ProjectStage,
        project_status: project.project_status as ProjectStatus,
        onboarding_data: (project.onboarding_data ?? {}) as OnboardingData,
        admin_notes: project.admin_notes ?? undefined,
        meeting_file_url: project.meeting_file_url ?? undefined,
      }}
    />
  )
}
```

- [ ] **Step 2: Add Onboarding sub-link to `AdminSidebar.tsx`**

In `components/AdminSidebar.tsx`, find the `{isActive && (...)}` block that renders the sub-navigation links (Content Manager, Analytics, Pedidos) and add an Onboarding link as the first item:

```typescript
{isActive && (
  <div className="ml-4 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-neutral-800 pl-3">
    <Link
      href={`/admin/clients/${client.id}/onboarding`}
      onClick={() => setIsOpen(false)}
      className={`text-xs py-1.5 px-2 rounded-md transition ${
        pathname.includes('/onboarding')
          ? 'text-white bg-neutral-800'
          : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
      }`}
    >
      Onboarding
    </Link>
    <Link
      href={`/admin/clients/${client.id}/collections`}
      onClick={() => setIsOpen(false)}
      className={`text-xs py-1.5 px-2 rounded-md transition ${
        pathname.includes('/collections')
          ? 'text-white bg-neutral-800'
          : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
      }`}
    >
      Content Manager
    </Link>
    <Link
      href={`/admin/clients/${client.id}/analytics`}
      onClick={() => setIsOpen(false)}
      className={`flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-md transition ${
        pathname.includes('/analytics')
          ? 'text-white bg-neutral-800'
          : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
      }`}
    >
      Analytics
      <span className="text-[9px] px-1 py-0.5 rounded bg-neutral-700 text-neutral-400">beta</span>
    </Link>
    <Link
      href={`/admin/clients/${client.id}/requests`}
      onClick={() => setIsOpen(false)}
      className={`text-xs py-1.5 px-2 rounded-md transition ${
        pathname.includes('/requests')
          ? 'text-white bg-neutral-800'
          : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
      }`}
    >
      Pedidos
    </Link>
  </div>
)}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add app/admin/clients/[id]/onboarding/page.tsx components/AdminSidebar.tsx
git commit -m "feat: add admin onboarding page and sidebar link for client onboarding tab"
```

---

## Verification Checklist

After all tasks are complete, manually verify the following flows:

- [ ] **Development client**: Log in as a client with `stage = 'development'` → lands on `/onboarding` → sidebar shows only "Mi Sitio" → trying to go to `/collections` redirects to `/onboarding`
- [ ] **Onboarding checklist**: Fill in the Brand section → save → progress bar updates → section shows "✓ Completo"
- [ ] **Admin status control**: Go to `/admin/clients/[id]/onboarding` → change status from "Pago recibido" to "En desarrollo" → client's timeline updates
- [ ] **Delivery confirmation**: Admin sets status to "Entregado y publicado" → confirmation dialog appears → confirm → client `stage` becomes `production`
- [ ] **Production client**: Client with `stage = 'production'` → lands on `/collections` → sidebar shows CMS/analytics/requests → `/onboarding` redirects to `/collections`
- [ ] **Admin transcript**: Upload a PDF to the meeting transcript field → file appears as downloadable link → admin notes save correctly
