# Softwind Clients CMS Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private portal where Softwind clients can edit their Framer CMS content and publish changes directly from the browser.

**Architecture:** Next.js 16 App Router + Supabase (auth + DB) + `framer-api` npm (WebSocket to Framer) + Cloudflare R2 (media). Admin creates client accounts and links Framer projects. Clients log in and edit CMS items — changes publish automatically via Framer Server API.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Supabase (`@supabase/ssr`), `framer-api`, `@aws-sdk/client-s3`, TipTap, Vitest

---

## File Map

```
app/
  layout.tsx                        # Root layout, Tailwind, font
  globals.css                       # @import "tailwindcss"
  login/page.tsx                    # Login page (public)
  page.tsx                          # Root redirect (client→/collections, admin→/admin)
  collections/
    page.tsx                        # Client: list CMS collections
    [id]/
      page.tsx                      # Client: list items in collection
      [itemId]/
        page.tsx                    # Client: edit item form
  admin/
    page.tsx                        # Admin: list clients
    clients/
      new/page.tsx                  # Admin: create client
      [id]/page.tsx                 # Admin: edit client
  api/
    upload-url/route.ts             # Presigned R2 PUT URL

lib/
  types.ts                          # All TypeScript interfaces
  crypto.ts                         # AES-256-GCM encrypt/decrypt for Framer API keys
  framer.ts                         # Framer API wrapper (connect, getCollections, updateItem, publish)
  r2.ts                             # R2 presigned URL generation
  compress-image.ts                 # Client-side WebP compression (browser only)
  supabase/
    client.ts                       # Browser Supabase client
    server.ts                       # Server Supabase client (SSR cookies)
    admin.ts                        # Service-role client for user management

components/
  fields/
    StringField.tsx
    NumberField.tsx
    DateField.tsx
    BooleanField.tsx
    ColorField.tsx
    LinkField.tsx
    EnumField.tsx
    FormattedTextField.tsx          # TipTap rich text
    ImageField.tsx                  # Upload → compress → R2
    FileField.tsx                   # Upload → R2
    GalleryField.tsx                # Multi-upload → R2
  FieldRenderer.tsx                 # Dispatches to correct field component
  ItemForm.tsx                      # Full item edit form + save + publish

middleware.ts                       # Auth + role-based routing

__tests__/
  lib/crypto.test.ts
  lib/framer.test.ts

supabase/
  migration.sql                     # DB schema + RLS policies

.env.local.example
next.config.ts
vitest.config.ts
package.json
```

---

## Task 1: Scaffold — Next.js project, dependencies, Vitest

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `app/globals.css`, `app/layout.tsx`, `.env.local.example`, `.gitignore`

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/ionikullock/Desktop/Coding_Tools/Softwind-Clients
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --yes
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr framer-api \
  @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
  @tiptap/react @tiptap/pm @tiptap/starter-kit

npm install -D vitest @vitejs/plugin-react @testing-library/react \
  @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Replace `app/globals.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 4: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 5: Write `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Write `next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] **Step 7: Write `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Softwind Clients',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-neutral-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Write `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ENCRYPTION_KEY=<64 hex chars — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
NEXT_PUBLIC_R2_PUBLIC_URL=
```

- [ ] **Step 9: Write `.gitignore`** (add to existing if created by create-next-app)

Ensure `.env.local` is in `.gitignore`.

- [ ] **Step 10: Add test script to `package.json`**

Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 11: Verify setup compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with all dependencies"
```

---

## Task 2: Types + Crypto

**Files:**
- Create: `lib/types.ts`, `lib/crypto.ts`, `__tests__/lib/crypto.test.ts`

- [ ] **Step 1: Write `lib/types.ts`**

```typescript
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
  created_at: string
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

export interface FramerField {
  id: string
  name: string
  type: FramerFieldType
  userEditable?: boolean
  cases?: string[]
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

- [ ] **Step 2: Write failing test `__tests__/lib/crypto.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'

describe('crypto', () => {
  it('encrypts and decrypts a string', async () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const original = 'fr_supersecretapikey123'
    const ciphertext = encrypt(original)
    expect(ciphertext).not.toBe(original)
    expect(ciphertext).toContain(':')
    expect(decrypt(ciphertext)).toBe(original)
  })

  it('produces different ciphertext each time (random IV)', async () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
    const { encrypt } = await import('@/lib/crypto')
    const a = encrypt('same')
    const b = encrypt('same')
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
npx vitest run __tests__/lib/crypto.test.ts
```
Expected: FAIL with "Cannot find module '@/lib/crypto'"

- [ ] **Step 4: Write `lib/crypto.ts`**

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('ENCRYPTION_KEY must be 64 hex chars')
  return Buffer.from(hex, 'hex')
}

export function encrypt(text: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx vitest run __tests__/lib/crypto.test.ts
```
Expected: 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/crypto.ts __tests__/lib/crypto.test.ts vitest.config.ts vitest.setup.ts
git commit -m "feat: add TypeScript types and AES-256-GCM crypto for API key encryption"
```

---

## Task 3: Supabase setup

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `supabase/migration.sql`

**Prerequisites:** Create a Supabase project at supabase.com. Copy the Project URL, anon key, and service role key into `.env.local`.

- [ ] **Step 1: Write `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 2: Write `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Write `lib/supabase/admin.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

// Service-role client — NEVER import this in browser/client components
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 4: Write `supabase/migration.sql`**

Run this SQL in the Supabase dashboard → SQL Editor:

```sql
-- Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('admin', 'client')),
  name text not null,
  created_at timestamptz default now()
);

-- Projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  client_user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  framer_project_url text not null,
  framer_api_key_encrypted text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;

-- profiles: user can read own profile
create policy "own profile read"
  on public.profiles for select
  using (auth.uid() = id);

-- profiles: admins can read all (for admin panel)
create policy "admin profiles read"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- projects: client can read own
create policy "own project read"
  on public.projects for select
  using (client_user_id = auth.uid());

-- projects: admins can do everything
create policy "admin projects all"
  on public.projects for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

- [ ] **Step 5: Create the first admin user**

In Supabase dashboard → Authentication → Users → Add user:
- Email: your email
- Password: choose a password
- Copy the user UUID

Then in SQL Editor (sets both the profile AND the app_metadata.role that middleware reads):
```sql
-- Create profile
insert into public.profiles (id, role, name)
values ('<your-user-uuid>', 'admin', 'Softwind Admin');

-- Set app_metadata so middleware can read the role from the JWT
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
where id = '<your-user-uuid>';
```

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/ supabase/migration.sql
git commit -m "feat: add Supabase clients and DB migration"
```

---

## Task 4: Auth + Middleware

**Files:**
- Create: `middleware.ts`, `app/login/page.tsx`, `app/page.tsx`

- [ ] **Step 1: Write `middleware.ts`**

```typescript
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
  if (role === 'admin' && path.startsWith('/collections')) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
```

- [ ] **Step 2: Write `app/login/page.tsx`**

```typescript
'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Email o contraseña incorrectos')
    } else {
      router.refresh()
      router.push('/')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <div className="mb-2">
          <h1 className="text-xl font-semibold">Softwind</h1>
          <p className="text-neutral-500 text-sm mt-1">Ingresá con tu cuenta</p>
        </div>
        <input
          type="email"
          placeholder="Email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="py-3 bg-white text-black font-medium rounded-full text-sm disabled:opacity-30 hover:bg-neutral-200 transition"
        >
          {loading ? 'Entrando...' : 'Entrar →'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Write `app/page.tsx`** (root redirect — middleware handles the actual redirect, this is a fallback)

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const role = user.app_metadata?.role
  redirect(role === 'admin' ? '/admin' : '/collections')
}
```

- [ ] **Step 4: Test login manually**

```bash
npm run dev
```

Open `http://localhost:3000/login`. Log in with the admin credentials created in Task 3. Should redirect to `/admin` (which shows a 404 for now — that's expected).

- [ ] **Step 5: Commit**

```bash
git add middleware.ts app/login/page.tsx app/page.tsx
git commit -m "feat: add auth login page and middleware with role-based routing"
```

---

## Task 5: Framer API wrapper

**Files:**
- Create: `lib/framer.ts`, `__tests__/lib/framer.test.ts`

- [ ] **Step 1: Write failing test `__tests__/lib/framer.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDisconnect = vi.fn()
const mockPublish = vi.fn().mockResolvedValue({ deployment: { id: 'dep-1' } })
const mockDeploy = vi.fn().mockResolvedValue({ hostnames: ['https://mysite.framer.website'] })
const mockAddItems = vi.fn()
const mockGetItems = vi.fn().mockResolvedValue([
  { id: 'item-1', slug: 'hello', fieldData: { 'field-1': { type: 'string', value: 'Hello' } } },
])
const mockGetFields = vi.fn().mockResolvedValue([
  { id: 'field-1', name: 'Title', type: 'string' },
])
const mockGetCollections = vi.fn().mockResolvedValue([
  { id: 'col-1', name: 'Blog', getFields: mockGetFields, getItems: mockGetItems, addItems: mockAddItems },
])

vi.mock('framer-api', () => ({
  connect: vi.fn().mockResolvedValue({
    getCollections: mockGetCollections,
    publish: mockPublish,
    deploy: mockDeploy,
    disconnect: mockDisconnect,
  }),
}))

import { getCollections, getCollectionFields, getItems, updateItemAndPublish } from '@/lib/framer'

beforeEach(() => { vi.clearAllMocks() })

describe('framer lib', () => {
  it('getCollections returns id and name', async () => {
    const cols = await getCollections('https://framer.com/projects/x', 'key')
    expect(cols).toEqual([{ id: 'col-1', name: 'Blog' }])
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('getCollectionFields returns field definitions', async () => {
    const fields = await getCollectionFields('https://framer.com/projects/x', 'key', 'col-1')
    expect(fields[0]).toMatchObject({ id: 'field-1', name: 'Title', type: 'string' })
  })

  it('getItems returns items', async () => {
    const items = await getItems('https://framer.com/projects/x', 'key', 'col-1')
    expect(items[0].id).toBe('item-1')
  })

  it('updateItemAndPublish calls addItems, publish, deploy', async () => {
    await updateItemAndPublish('https://framer.com/projects/x', 'key', 'col-1', {
      id: 'item-1',
      slug: 'hello',
      fieldData: { 'field-1': { type: 'string', value: 'Updated' } },
    })
    expect(mockAddItems).toHaveBeenCalledWith([expect.objectContaining({ id: 'item-1' })])
    expect(mockPublish).toHaveBeenCalled()
    expect(mockDeploy).toHaveBeenCalledWith('dep-1')
    expect(mockDisconnect).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run __tests__/lib/framer.test.ts
```
Expected: FAIL with "Cannot find module '@/lib/framer'"

- [ ] **Step 3: Write `lib/framer.ts`**

```typescript
import { connect } from 'framer-api'
import type { FramerCollection, FramerField, FramerItem } from './types'

async function withFramer<T>(
  projectUrl: string,
  apiKey: string,
  fn: (framer: Awaited<ReturnType<typeof connect>>) => Promise<T>
): Promise<T> {
  const framer = await connect(projectUrl, apiKey)
  try {
    return await fn(framer)
  } finally {
    await framer.disconnect()
  }
}

export async function getCollections(
  projectUrl: string,
  apiKey: string
): Promise<FramerCollection[]> {
  return withFramer(projectUrl, apiKey, async (framer) => {
    const cols = await framer.getCollections()
    return cols.map((c: any) => ({ id: c.id, name: c.name }))
  })
}

export async function getCollectionFields(
  projectUrl: string,
  apiKey: string,
  collectionId: string
): Promise<FramerField[]> {
  return withFramer(projectUrl, apiKey, async (framer) => {
    const cols = await framer.getCollections()
    const col = cols.find((c: any) => c.id === collectionId)
    if (!col) throw new Error(`Collection ${collectionId} not found`)
    const fields = await col.getFields()
    return fields.map((f: any) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      userEditable: f.userEditable,
      cases: f.cases,
    }))
  })
}

export async function getItems(
  projectUrl: string,
  apiKey: string,
  collectionId: string
): Promise<FramerItem[]> {
  return withFramer(projectUrl, apiKey, async (framer) => {
    const cols = await framer.getCollections()
    const col = cols.find((c: any) => c.id === collectionId)
    if (!col) throw new Error(`Collection ${collectionId} not found`)
    const items = await col.getItems()
    return items.map((item: any) => ({
      id: item.id,
      slug: item.slug,
      draft: item.draft,
      fieldData: item.fieldData ?? {},
    }))
  })
}

export async function updateItemAndPublish(
  projectUrl: string,
  apiKey: string,
  collectionId: string,
  item: FramerItem
): Promise<void> {
  await withFramer(projectUrl, apiKey, async (framer) => {
    const cols = await framer.getCollections()
    const col = cols.find((c: any) => c.id === collectionId)
    if (!col) throw new Error(`Collection ${collectionId} not found`)
    await col.addItems([item])
    const published = await framer.publish()
    await framer.deploy(published.deployment.id)
  })
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run __tests__/lib/framer.test.ts
```
Expected: 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/framer.ts __tests__/lib/framer.test.ts
git commit -m "feat: add Framer API wrapper (getCollections, getItems, updateItemAndPublish)"
```

---

## Task 6: R2 + image compression + upload-url route

**Files:**
- Create: `lib/r2.ts`, `lib/compress-image.ts`, `app/api/upload-url/route.ts`

- [ ] **Step 1: Write `lib/r2.ts`**

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

const BUCKET = () => process.env.R2_BUCKET_NAME!

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const client = getClient()
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: BUCKET(), Key: key, ContentType: contentType }),
    { expiresIn }
  )
}
```

- [ ] **Step 2: Write `lib/compress-image.ts`**

```typescript
const MAX_PX = 2048
const QUALITY = 0.82

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, MAX_PX / Math.max(w, h))
      w = Math.round(w * scale)
      h = Math.round(h * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const name = file.name.replace(/\.[^.]+$/, '.webp')
          resolve(new File([blob], name, { type: 'image/webp', lastModified: Date.now() }))
        },
        'image/webp',
        QUALITY
      )
    }

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}
```

- [ ] **Step 3: Write `app/api/upload-url/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPresignedUploadUrl } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  // Verify authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  const contentType = searchParams.get('contentType') ?? 'application/octet-stream'

  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  try {
    const url = await getPresignedUploadUrl(key, contentType)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/r2.ts lib/compress-image.ts app/api/upload-url/route.ts
git commit -m "feat: add R2 presigned upload URL and client-side image compression"
```

---

## Task 7: Admin — list clients

**Files:**
- Create: `app/admin/page.tsx`, `app/admin/layout.tsx`

- [ ] **Step 1: Write `app/admin/layout.tsx`**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-lg font-semibold">Softwind Admin</h1>
        <Link href="/admin/clients/new"
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full hover:bg-neutral-200 transition">
          + Nuevo cliente
        </Link>
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Write `app/admin/page.tsx`**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Get all client profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, projects(*)')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  // Get auth users to show emails
  const { data: { users } } = await adminClient.auth.admin.listUsers()
  const emailMap = Object.fromEntries(users.map(u => [u.id, u.email]))

  return (
    <div>
      {!profiles?.length && (
        <p className="text-neutral-500 text-sm">No hay clientes todavía.</p>
      )}
      <div className="flex flex-col gap-3">
        {profiles?.map((p) => (
          <Link
            key={p.id}
            href={`/admin/clients/${p.id}`}
            className="flex items-center justify-between border border-neutral-800 rounded-xl px-5 py-4 hover:border-neutral-600 transition"
          >
            <div>
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-neutral-500 text-xs mt-0.5">{emailMap[p.id] ?? '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-400">{(p as any).projects?.[0]?.name ?? 'Sin proyecto'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify page loads**

```bash
npm run dev
```
Open `http://localhost:3000/admin` — should show "No hay clientes todavía."

- [ ] **Step 4: Commit**

```bash
git add app/admin/
git commit -m "feat: admin layout and client list page"
```

---

## Task 8: Admin — create client

**Files:**
- Create: `app/admin/clients/new/page.tsx`

- [ ] **Step 1: Write `app/admin/clients/new/page.tsx`**

```typescript
'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { encrypt } from '@/lib/crypto'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    projectName: '',
    framerProjectUrl: '',
    framerApiKey: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al crear el cliente')
    } else {
      router.push('/admin')
    }
  }

  const inputClass = "bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition w-full"
  const labelClass = "text-xs text-neutral-400 mb-1 block"

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-semibold mb-6">Nuevo cliente</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Nombre</label>
          <input className={inputClass} value={form.name}
            onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" className={inputClass} value={form.email}
            onChange={e => set('email', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Contraseña inicial</label>
          <input type="password" className={inputClass} value={form.password}
            onChange={e => set('password', e.target.value)} required minLength={8} />
        </div>
        <hr className="border-neutral-800" />
        <div>
          <label className={labelClass}>Nombre del proyecto</label>
          <input className={inputClass} value={form.projectName}
            onChange={e => set('projectName', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Framer Project URL</label>
          <input className={inputClass} value={form.framerProjectUrl}
            onChange={e => set('framerProjectUrl', e.target.value)}
            placeholder="https://framer.com/projects/..." required />
        </div>
        <div>
          <label className={labelClass}>Framer API Key</label>
          <input type="password" className={inputClass} value={form.framerApiKey}
            onChange={e => set('framerApiKey', e.target.value)}
            placeholder="fr_..." required />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-3 bg-white text-black font-medium rounded-full text-sm disabled:opacity-30 hover:bg-neutral-200 transition mt-2"
        >
          {loading ? 'Creando...' : 'Crear cliente →'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Write `app/api/admin/clients/route.ts`**

Create directory `app/api/admin/clients/`.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  // Verify admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, email, password, projectName, framerProjectUrl, framerApiKey } = await req.json()

  if (!name || !email || !password || !projectName || !framerProjectUrl || !framerApiKey) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Create auth user with role in app_metadata
  const { data: { user: newUser }, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    app_metadata: { role: 'client' },
    email_confirm: true,
  })

  if (createError || !newUser) {
    return NextResponse.json({ error: createError?.message ?? 'Error al crear usuario' }, { status: 500 })
  }

  // Create profile
  await adminClient.from('profiles').insert({
    id: newUser.id,
    role: 'client',
    name,
  })

  // Create project with encrypted API key
  const { error: projectError } = await adminClient.from('projects').insert({
    client_user_id: newUser.id,
    name: projectName,
    framer_project_url: framerProjectUrl,
    framer_api_key_encrypted: encrypt(framerApiKey),
  })

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Test manually**

```bash
npm run dev
```
Go to `http://localhost:3000/admin/clients/new` and create a test client. Should redirect to `/admin` showing the new client.

- [ ] **Step 4: Commit**

```bash
git add app/admin/clients/new/ app/api/admin/
git commit -m "feat: admin create client form + API route"
```

---

## Task 9: Admin — edit client

**Files:**
- Create: `app/admin/clients/[id]/page.tsx`, modify `app/api/admin/clients/route.ts`

- [ ] **Step 1: Write `app/admin/clients/[id]/page.tsx`**

```typescript
import EditClientForm from './EditClientForm'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, projects(*)')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: { user } } = await adminClient.auth.admin.getUserById(id)

  const project = (profile as any).projects?.[0] ?? null

  return (
    <EditClientForm
      id={id}
      defaultName={profile.name}
      defaultEmail={user?.email ?? ''}
      defaultProjectName={project?.name ?? ''}
      defaultFramerProjectUrl={project?.framer_project_url ?? ''}
      projectId={project?.id ?? null}
    />
  )
}
```

- [ ] **Step 2: Write `app/admin/clients/[id]/EditClientForm.tsx`**

```typescript
'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
  defaultName: string
  defaultEmail: string
  defaultProjectName: string
  defaultFramerProjectUrl: string
  projectId: string | null
}

export default function EditClientForm({ id, defaultName, defaultEmail, defaultProjectName, defaultFramerProjectUrl, projectId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    password: '',
    projectName: defaultProjectName,
    framerProjectUrl: defaultFramerProjectUrl,
    framerApiKey: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, projectId }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al actualizar')
    } else {
      router.push('/admin')
    }
  }

  const inputClass = "bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition w-full"
  const labelClass = "text-xs text-neutral-400 mb-1 block"

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-semibold mb-6">Editar cliente</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Nombre</label>
          <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Nueva contraseña (dejar vacío para no cambiar)</label>
          <input type="password" className={inputClass} value={form.password} onChange={e => set('password', e.target.value)} minLength={8} />
        </div>
        <hr className="border-neutral-800" />
        <div>
          <label className={labelClass}>Nombre del proyecto</label>
          <input className={inputClass} value={form.projectName} onChange={e => set('projectName', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Framer Project URL</label>
          <input className={inputClass} value={form.framerProjectUrl} onChange={e => set('framerProjectUrl', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Nueva Framer API Key (dejar vacío para no cambiar)</label>
          <input type="password" className={inputClass} value={form.framerApiKey} onChange={e => set('framerApiKey', e.target.value)} placeholder="fr_..." />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button type="submit" disabled={loading}
          className="py-3 bg-white text-black font-medium rounded-full text-sm disabled:opacity-30 hover:bg-neutral-200 transition mt-2">
          {loading ? 'Guardando...' : 'Guardar cambios →'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Write `app/api/admin/clients/[id]/route.ts`**

Create directory `app/api/admin/clients/[id]/`.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/crypto'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, email, password, projectName, framerProjectUrl, framerApiKey, projectId } = await req.json()
  const adminClient = createAdminClient()

  // Update auth user (email + optional password)
  const authUpdate: Record<string, string> = { email }
  if (password) authUpdate.password = password
  await adminClient.auth.admin.updateUserById(id, authUpdate)

  // Update profile name
  await adminClient.from('profiles').update({ name }).eq('id', id)

  // Update project
  const projectUpdate: Record<string, string> = {
    name: projectName,
    framer_project_url: framerProjectUrl,
  }
  if (framerApiKey) {
    projectUpdate.framer_api_key_encrypted = encrypt(framerApiKey)
  }
  if (projectId) {
    await adminClient.from('projects').update(projectUpdate).eq('id', projectId)
  } else {
    await adminClient.from('projects').insert({
      client_user_id: id,
      ...projectUpdate,
      framer_api_key_encrypted: framerApiKey ? encrypt(framerApiKey) : '',
    })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/clients/[id]/ app/api/admin/clients/[id]/
git commit -m "feat: admin edit client page and PATCH API route"
```

---

## Task 10: Client — collections page

**Files:**
- Create: `app/collections/page.tsx`, `app/collections/layout.tsx`

- [ ] **Step 1: Write `app/collections/layout.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CollectionsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-lg font-semibold">Hola, {profile?.name ?? 'Cliente'}</h1>
          <p className="text-neutral-500 text-sm mt-1">Tu contenido</p>
        </div>
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Write `app/collections/page.tsx`**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getCollections } from '@/lib/framer'

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('client_user_id', user!.id)
    .single()

  if (!project) {
    return <p className="text-neutral-500 text-sm">No tenés ningún proyecto configurado todavía.</p>
  }

  const apiKey = decrypt(project.framer_api_key_encrypted)
  const collections = await getCollections(project.framer_project_url, apiKey)

  return (
    <div className="flex flex-col gap-3">
      {collections.map((col) => (
        <Link
          key={col.id}
          href={`/collections/${col.id}`}
          className="flex items-center justify-between border border-neutral-800 rounded-xl px-5 py-4 hover:border-neutral-600 transition"
        >
          <span className="font-medium text-sm">{col.name}</span>
          <span className="text-neutral-500 text-xs">→</span>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Test manually**

Log in as the test client. Should see their Framer CMS collections listed.

- [ ] **Step 4: Commit**

```bash
git add app/collections/
git commit -m "feat: client collections list page — reads from Framer API"
```

---

## Task 11: Client — items list page

**Files:**
- Create: `app/collections/[id]/page.tsx`

- [ ] **Step 1: Write `app/collections/[id]/page.tsx`**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getItems } from '@/lib/framer'

export default async function ItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: collectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('client_user_id', user!.id)
    .single()

  if (!project) return <p className="text-neutral-500 text-sm">Sin proyecto.</p>

  const apiKey = decrypt(project.framer_api_key_encrypted)
  const items = await getItems(project.framer_project_url, apiKey, collectionId)

  return (
    <div>
      <Link href="/collections" className="text-xs text-neutral-500 hover:text-white mb-6 inline-block">
        ← Volver
      </Link>
      <div className="flex flex-col gap-3 mt-4">
        {items.length === 0 && (
          <p className="text-neutral-500 text-sm">No hay items en esta colección.</p>
        )}
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/collections/${collectionId}/${item.id}`}
            className="flex items-center justify-between border border-neutral-800 rounded-xl px-5 py-4 hover:border-neutral-600 transition"
          >
            <div>
              <span className="font-medium text-sm">{item.slug}</span>
              {item.draft && (
                <span className="ml-2 text-xs text-yellow-500 border border-yellow-700 rounded px-1">borrador</span>
              )}
            </div>
            <span className="text-neutral-500 text-xs">Editar →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/collections/[id]/page.tsx
git commit -m "feat: collection items list page"
```

---

## Task 12: Field components

**Files:**
- Create: all files in `components/fields/`, `components/FieldRenderer.tsx`

- [ ] **Step 1: Write `components/fields/StringField.tsx`**

```typescript
interface Props {
  fieldId: string
  label: string
  value: string | null
  onChange: (value: string) => void
}
export function StringField({ fieldId, label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
      />
    </div>
  )
}
```

- [ ] **Step 2: Write `components/fields/NumberField.tsx`**

```typescript
interface Props { fieldId: string; label: string; value: number | null; onChange: (value: number) => void }
export function NumberField({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
      />
    </div>
  )
}
```

- [ ] **Step 3: Write `components/fields/DateField.tsx`**

```typescript
interface Props { fieldId: string; label: string; value: string | null; onChange: (value: string) => void }
export function DateField({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
      />
    </div>
  )
}
```

- [ ] **Step 4: Write `components/fields/BooleanField.tsx`**

```typescript
interface Props { fieldId: string; label: string; value: boolean; onChange: (value: boolean) => void }
export function BooleanField({ label, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition ${value ? 'bg-white' : 'bg-neutral-700'}`}
      >
        <span className={`block w-4 h-4 rounded-full bg-black mx-1 transition-transform ${value ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Write `components/fields/ColorField.tsx`**

```typescript
interface Props { fieldId: string; label: string; value: string | null; onChange: (value: string) => void }
export function ColorField({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
        />
        <span className="text-sm font-mono text-neutral-400">{value ?? '#000000'}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write `components/fields/LinkField.tsx`**

```typescript
interface LinkValue { url: string; label?: string }
interface Props { fieldId: string; label: string; value: LinkValue | null; onChange: (value: LinkValue) => void }
export function LinkField({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        type="url"
        placeholder="https://..."
        value={value?.url ?? ''}
        onChange={(e) => onChange({ ...value, url: e.target.value })}
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
      />
      <input
        type="text"
        placeholder="Texto del link (opcional)"
        value={value?.label ?? ''}
        onChange={(e) => onChange({ ...value, url: value?.url ?? '', label: e.target.value })}
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-neutral-500 transition"
      />
    </div>
  )
}
```

- [ ] **Step 7: Write `components/fields/EnumField.tsx`**

```typescript
interface Props { fieldId: string; label: string; value: string | null; cases: string[]; onChange: (value: string) => void }
export function EnumField({ label, value, cases, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
      >
        <option value="">— Seleccioná —</option>
        {cases.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}
```

- [ ] **Step 8: Write `components/fields/FormattedTextField.tsx`**

```typescript
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface Props { fieldId: string; label: string; value: string | null; onChange: (value: string, contentType: 'html') => void }
export function FormattedTextField({ label, value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value ?? '',
    onUpdate: ({ editor }) => onChange(editor.getHTML(), 'html'),
  })

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm min-h-[120px] prose prose-invert prose-sm max-w-none focus-within:border-neutral-500 transition">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Write `components/fields/ImageField.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { compressImage } from '@/lib/compress-image'

interface Props {
  fieldId: string
  label: string
  value: { url: string } | null
  onChange: (value: { url: string }) => void
}

export function ImageField({ fieldId, label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    const compressed = await compressImage(file)
    const ext = compressed.type === 'image/webp' ? 'webp' : file.name.split('.').pop()
    const key = `uploads/${fieldId}/${Date.now()}.${ext}`

    const res = await fetch(`/api/upload-url?key=${key}&contentType=${compressed.type}`)
    const { url: presignedUrl } = await res.json()

    await fetch(presignedUrl, {
      method: 'PUT',
      body: compressed,
      headers: { 'Content-Type': compressed.type },
    })

    const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
    onChange({ url: `${publicBase}/${key}` })
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <div
        onClick={() => document.getElementById(`img-${fieldId}`)?.click()}
        className="border-2 border-dashed border-neutral-700 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-neutral-500 transition overflow-hidden relative"
      >
        <input
          id={`img-${fieldId}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />
        {uploading ? (
          <span className="text-neutral-500 text-xs">Subiendo...</span>
        ) : value?.url ? (
          <img src={value.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-neutral-600 text-2xl">+</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Write `components/fields/FileField.tsx`**

```typescript
'use client'
import { useState } from 'react'

interface Props {
  fieldId: string
  label: string
  value: { url: string; name?: string } | null
  onChange: (value: { url: string; name: string }) => void
}

export function FileField({ fieldId, label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    const key = `uploads/${fieldId}/${Date.now()}-${file.name}`
    const res = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${file.type}`)
    const { url: presignedUrl } = await res.json()
    await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
    onChange({ url: `${publicBase}/${key}`, name: file.name })
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <div className="flex items-center gap-3">
        {value?.name && <span className="text-sm text-neutral-400 truncate max-w-[200px]">{value.name}</span>}
        <label className="px-4 py-2 border border-neutral-700 rounded-lg text-xs cursor-pointer hover:border-neutral-500 transition">
          {uploading ? 'Subiendo...' : 'Elegir archivo'}
          <input type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        </label>
      </div>
    </div>
  )
}
```

- [ ] **Step 11: Write `components/fields/GalleryField.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { compressImage } from '@/lib/compress-image'

interface Props {
  fieldId: string
  label: string
  value: Array<{ url: string }> | null
  onChange: (value: Array<{ url: string }>) => void
}

export function GalleryField({ fieldId, label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const urls = value ?? []

  async function handleFiles(files: FileList) {
    setUploading(true)
    const newUrls: Array<{ url: string }> = []
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file)
      const ext = compressed.type === 'image/webp' ? 'webp' : file.name.split('.').pop()
      const key = `uploads/${fieldId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const res = await fetch(`/api/upload-url?key=${key}&contentType=${compressed.type}`)
      const { url: presignedUrl } = await res.json()
      await fetch(presignedUrl, { method: 'PUT', body: compressed, headers: { 'Content-Type': compressed.type } })
      const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
      newUrls.push({ url: `${publicBase}/${key}` })
    }
    onChange([...urls, ...newUrls])
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-neutral-400">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((img, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-700">
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(urls.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-black/70 rounded-full w-5 h-5 text-xs flex items-center justify-center"
            >×</button>
          </div>
        ))}
        <label className="aspect-square border-2 border-dashed border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-neutral-500 transition">
          {uploading ? <span className="text-xs text-neutral-500">...</span> : <span className="text-neutral-600 text-2xl">+</span>}
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }} />
        </label>
      </div>
    </div>
  )
}
```

- [ ] **Step 12: Write `components/FieldRenderer.tsx`**

```typescript
'use client'
import type { FramerField, FramerFieldValue } from '@/lib/types'
import { StringField } from './fields/StringField'
import { NumberField } from './fields/NumberField'
import { DateField } from './fields/DateField'
import { BooleanField } from './fields/BooleanField'
import { ColorField } from './fields/ColorField'
import { LinkField } from './fields/LinkField'
import { EnumField } from './fields/EnumField'
import { FormattedTextField } from './fields/FormattedTextField'
import { ImageField } from './fields/ImageField'
import { FileField } from './fields/FileField'
import { GalleryField } from './fields/GalleryField'

interface Props {
  field: FramerField
  value: FramerFieldValue | undefined
  onChange: (fieldId: string, value: FramerFieldValue) => void
}

export function FieldRenderer({ field, value, onChange }: Props) {
  const v = value?.value

  switch (field.type) {
    case 'string':
      return <StringField fieldId={field.id} label={field.name} value={v as string ?? null}
        onChange={(val) => onChange(field.id, { type: 'string', value: val })} />
    case 'number':
      return <NumberField fieldId={field.id} label={field.name} value={v as number ?? null}
        onChange={(val) => onChange(field.id, { type: 'number', value: val })} />
    case 'date':
      return <DateField fieldId={field.id} label={field.name} value={v as string ?? null}
        onChange={(val) => onChange(field.id, { type: 'date', value: val })} />
    case 'boolean':
      return <BooleanField fieldId={field.id} label={field.name} value={!!(v)}
        onChange={(val) => onChange(field.id, { type: 'boolean', value: val })} />
    case 'color':
      return <ColorField fieldId={field.id} label={field.name} value={v as string ?? null}
        onChange={(val) => onChange(field.id, { type: 'color', value: val })} />
    case 'link':
      return <LinkField fieldId={field.id} label={field.name} value={v as any ?? null}
        onChange={(val) => onChange(field.id, { type: 'link', value: val })} />
    case 'enum':
      return <EnumField fieldId={field.id} label={field.name} value={v as string ?? null}
        cases={field.cases ?? []}
        onChange={(val) => onChange(field.id, { type: 'enum', value: val })} />
    case 'formattedText':
      return <FormattedTextField fieldId={field.id} label={field.name}
        value={v as string ?? null}
        onChange={(val, ct) => onChange(field.id, { type: 'formattedText', value: val, contentType: ct })} />
    case 'image':
      return <ImageField fieldId={field.id} label={field.name} value={v as any ?? null}
        onChange={(val) => onChange(field.id, { type: 'image', value: val })} />
    case 'file':
      return <FileField fieldId={field.id} label={field.name} value={v as any ?? null}
        onChange={(val) => onChange(field.id, { type: 'file', value: val })} />
    case 'array':
      return <GalleryField fieldId={field.id} label={field.name} value={v as any ?? null}
        onChange={(val) => onChange(field.id, { type: 'array', value: val })} />
    default:
      return <p className="text-xs text-neutral-500">Campo tipo "{field.type}" no soportado</p>
  }
}
```

- [ ] **Step 13: Commit**

```bash
git add components/
git commit -m "feat: all field components and FieldRenderer"
```

---

## Task 13: Item edit form — save + publish

**Files:**
- Create: `app/collections/[id]/[itemId]/page.tsx`, `app/collections/[id]/[itemId]/ItemEditClient.tsx`, `app/api/collections/[collectionId]/items/[itemId]/route.ts`

- [ ] **Step 1: Write `app/api/collections/[collectionId]/items/[itemId]/route.ts`**

Create all necessary directories.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { updateItemAndPublish } from '@/lib/framer'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string; itemId: string }> }
) {
  const { collectionId, itemId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('client_user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'No project found' }, { status: 404 })

  const { slug, fieldData } = await req.json()
  const apiKey = decrypt(project.framer_api_key_encrypted)

  try {
    await updateItemAndPublish(project.framer_project_url, apiKey, collectionId, {
      id: itemId,
      slug,
      fieldData,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Write `app/collections/[id]/[itemId]/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getCollectionFields, getItems } from '@/lib/framer'
import { notFound } from 'next/navigation'
import ItemEditClient from './ItemEditClient'
import Link from 'next/link'

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>
}) {
  const { id: collectionId, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('client_user_id', user!.id)
    .single()

  if (!project) notFound()

  const apiKey = decrypt(project.framer_api_key_encrypted)
  const [fields, items] = await Promise.all([
    getCollectionFields(project.framer_project_url, apiKey, collectionId),
    getItems(project.framer_project_url, apiKey, collectionId),
  ])

  const item = items.find((i) => i.id === itemId)
  if (!item) notFound()

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href={`/collections/${collectionId}`} className="text-xs text-neutral-500 hover:text-white mb-6 inline-block">
        ← Volver
      </Link>
      <h2 className="text-xl font-semibold mb-6">{item.slug}</h2>
      <ItemEditClient
        collectionId={collectionId}
        item={item}
        fields={fields}
      />
    </div>
  )
}
```

- [ ] **Step 3: Write `app/collections/[id]/[itemId]/ItemEditClient.tsx`**

```typescript
'use client'
import { useState } from 'react'
import type { FramerField, FramerItem, FramerFieldValue } from '@/lib/types'
import { FieldRenderer } from '@/components/FieldRenderer'

interface Props {
  collectionId: string
  item: FramerItem
  fields: FramerField[]
}

export default function ItemEditClient({ collectionId, item, fields }: Props) {
  const [fieldData, setFieldData] = useState<Record<string, FramerFieldValue>>(item.fieldData)
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(fieldId: string, value: FramerFieldValue) {
    setFieldData((prev) => ({ ...prev, [fieldId]: value }))
  }

  async function handleSave() {
    setStatus('saving')
    setErrorMsg('')
    const res = await fetch(`/api/collections/${collectionId}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: item.slug, fieldData }),
    })
    if (res.ok) {
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } else {
      const data = await res.json()
      setErrorMsg(data.error ?? 'Error al guardar')
      setStatus('error')
    }
  }

  const editableFields = fields.filter((f) => f.userEditable !== false)

  return (
    <div className="flex flex-col gap-6">
      {editableFields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={fieldData[field.id]}
          onChange={handleChange}
        />
      ))}

      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-3 bg-white text-black font-medium rounded-full text-sm disabled:opacity-30 hover:bg-neutral-200 transition"
        >
          {status === 'saving' ? 'Publicando...' : 'Guardar y publicar →'}
        </button>
        {status === 'done' && <p className="text-green-400 text-xs text-center mt-2">✓ Cambios publicados</p>}
        {status === 'error' && <p className="text-red-400 text-xs text-center mt-2">{errorMsg}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: all tests passing.

- [ ] **Step 5: Test full flow manually**

```bash
npm run dev
```

1. Log in as client
2. Navigate to a collection → click an item → edit a string field → click "Guardar y publicar"
3. Verify "Cambios publicados" toast appears
4. Check the live Framer site to confirm the change is live

- [ ] **Step 6: Commit**

```bash
git add app/collections/[id]/[itemId]/ app/api/collections/
git commit -m "feat: item edit form with save + publish to Framer"
```

---

## Deploy checklist

Before deploying to Vercel:

- [ ] Create Vercel project linked to this repo
- [ ] Add all env vars from `.env.local.example` to Vercel production
- [ ] Generate `ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Configure R2 CORS to allow PUT from Vercel domain (same as curva-demo-generator)
- [ ] Deploy: `npx vercel --prod`
