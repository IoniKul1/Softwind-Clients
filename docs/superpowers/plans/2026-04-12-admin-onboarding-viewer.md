# Admin Onboarding Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw JSON display in the admin onboarding tab with a human-readable per-section viewer that includes individual download buttons for every uploaded file.

**Architecture:** A new `OnboardingSectionViewer` client component dispatches to one of seven typed sub-renderers based on the section key. `AdminOnboardingTab` replaces its `<pre>JSON.stringify(...)` block with this component. No API or schema changes.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS, TypeScript, Vitest + React Testing Library.

---

## File Structure

- **Create:** `components/admin/OnboardingSectionViewer.tsx` — default export `OnboardingSectionViewer({ sectionKey, data })` with internal sub-components per section type
- **Create:** `__tests__/components/admin/OnboardingSectionViewer.test.tsx` — renders each section type with representative data
- **Modify:** `components/admin/AdminOnboardingTab.tsx:150-154` — replace `<pre>` block with `<OnboardingSectionViewer>`

---

### Task 1: OnboardingSectionViewer component + tests

**Files:**
- Create: `components/admin/OnboardingSectionViewer.tsx`
- Create: `__tests__/components/admin/OnboardingSectionViewer.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/admin/OnboardingSectionViewer.test.tsx`:

```tsx
// __tests__/components/admin/OnboardingSectionViewer.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OnboardingSectionViewer from '@/components/admin/OnboardingSectionViewer'
import type { OnboardingData } from '@/lib/types'

describe('OnboardingSectionViewer', () => {
  describe('brand', () => {
    it('renders image preview and download link for logo_url', () => {
      const data: OnboardingData['brand'] = { logo_url: 'https://cdn.example.com/logo.png' }
      render(<OnboardingSectionViewer sectionKey="brand" data={data} />)
      const img = screen.getByRole('img', { name: /logo/i })
      expect(img).toBeTruthy()
      const link = screen.getByRole('link', { name: /descargar logo/i })
      expect(link.getAttribute('href')).toBe('https://cdn.example.com/logo.png')
    })

    it('renders brand guide download link without image preview', () => {
      const data: OnboardingData['brand'] = { brand_guide_url: 'https://cdn.example.com/guide.pdf' }
      render(<OnboardingSectionViewer sectionKey="brand" data={data} />)
      const link = screen.getByRole('link', { name: /descargar guía/i })
      expect(link.getAttribute('href')).toBe('https://cdn.example.com/guide.pdf')
    })

    it('renders nothing when all fields are empty', () => {
      const data: OnboardingData['brand'] = {}
      const { container } = render(<OnboardingSectionViewer sectionKey="brand" data={data} />)
      expect(container.querySelector('a')).toBeNull()
      expect(container.querySelector('img')).toBeNull()
    })
  })

  describe('typography', () => {
    it('renders display font name and file download', () => {
      const data: OnboardingData['typography'] = {
        display_name: 'Playfair Display',
        display_file_url: 'https://cdn.example.com/playfair.ttf',
        body_name: 'Inter',
      }
      render(<OnboardingSectionViewer sectionKey="typography" data={data} />)
      expect(screen.getByText('Playfair Display')).toBeTruthy()
      expect(screen.getByText('Inter')).toBeTruthy()
      const link = screen.getByRole('link', { name: /descargar archivo/i })
      expect(link.getAttribute('href')).toBe('https://cdn.example.com/playfair.ttf')
    })

    it('renders Google Fonts link as external link', () => {
      const data: OnboardingData['typography'] = {
        body_name: 'Inter',
        body_google_url: 'https://fonts.google.com/specimen/Inter',
      }
      render(<OnboardingSectionViewer sectionKey="typography" data={data} />)
      const link = screen.getByRole('link', { name: /ver en google fonts/i })
      expect(link.getAttribute('href')).toBe('https://fonts.google.com/specimen/Inter')
      expect(link.getAttribute('target')).toBe('_blank')
    })
  })

  describe('colors', () => {
    it('renders color name and hex for each color', () => {
      const data: OnboardingData['colors'] = [
        { name: 'Azul principal', hex: '#3B5BF6' },
        { name: 'Negro', hex: '#0A0A0A' },
      ]
      render(<OnboardingSectionViewer sectionKey="colors" data={data} />)
      expect(screen.getByText('Azul principal')).toBeTruthy()
      expect(screen.getByText('#3B5BF6')).toBeTruthy()
      expect(screen.getByText('Negro')).toBeTruthy()
      expect(screen.getByText('#0A0A0A')).toBeTruthy()
    })
  })

  describe('references', () => {
    it('renders image thumbnail and download link when image_url present', () => {
      const data: OnboardingData['references'] = [
        { image_url: 'https://cdn.example.com/ref.jpg', note: 'mood board' },
      ]
      render(<OnboardingSectionViewer sectionKey="references" data={data} />)
      expect(screen.getByRole('img')).toBeTruthy()
      expect(screen.getByRole('link', { name: /descargar/i })).toBeTruthy()
      expect(screen.getByText('mood board')).toBeTruthy()
    })

    it('renders external link when only url present', () => {
      const data: OnboardingData['references'] = [
        { url: 'https://dribbble.com/shot/123' },
      ]
      render(<OnboardingSectionViewer sectionKey="references" data={data} />)
      const link = screen.getByRole('link', { name: /dribbble/i })
      expect(link.getAttribute('href')).toBe('https://dribbble.com/shot/123')
      expect(link.getAttribute('target')).toBe('_blank')
    })
  })

  describe('previous_site', () => {
    it('renders "Sin sitio web anterior" when na is true', () => {
      const data: OnboardingData['previous_site'] = { na: true }
      render(<OnboardingSectionViewer sectionKey="previous_site" data={data} />)
      expect(screen.getByText(/sin sitio web anterior/i)).toBeTruthy()
    })

    it('renders url and likes/dislikes when provided', () => {
      const data: OnboardingData['previous_site'] = {
        url: 'https://old.example.com',
        likes: 'El logo',
        dislikes: 'Los colores',
      }
      render(<OnboardingSectionViewer sectionKey="previous_site" data={data} />)
      const link = screen.getByRole('link', { name: /old\.example\.com/i })
      expect(link.getAttribute('href')).toBe('https://old.example.com')
      expect(screen.getByText('El logo')).toBeTruthy()
      expect(screen.getByText('Los colores')).toBeTruthy()
    })
  })

  describe('content', () => {
    it('renders file name and download link for each file', () => {
      const data: OnboardingData['content'] = {
        files: [{ url: 'https://cdn.example.com/copy.docx', name: 'copy.docx' }],
        notes: 'Usar el tono informal',
      }
      render(<OnboardingSectionViewer sectionKey="content" data={data} />)
      const link = screen.getByRole('link', { name: /descargar/i })
      expect(link.getAttribute('href')).toBe('https://cdn.example.com/copy.docx')
      expect(screen.getByText('copy.docx')).toBeTruthy()
      expect(screen.getByText('Usar el tono informal')).toBeTruthy()
    })
  })

  describe('business', () => {
    it('renders labeled fields for industry, audience, tone', () => {
      const data: OnboardingData['business'] = {
        industry: 'Tecnología',
        audience: 'Startups B2B',
        tone: 'Profesional y directo',
        competitors: ['Notion', 'Linear'],
        social: { Instagram: '@softwind', LinkedIn: 'https://linkedin.com/company/softwind' },
      }
      render(<OnboardingSectionViewer sectionKey="business" data={data} />)
      expect(screen.getByText('Tecnología')).toBeTruthy()
      expect(screen.getByText('Startups B2B')).toBeTruthy()
      expect(screen.getByText('Profesional y directo')).toBeTruthy()
      expect(screen.getByText('Notion')).toBeTruthy()
      expect(screen.getByText('Linear')).toBeTruthy()
      expect(screen.getByText('@softwind')).toBeTruthy()
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/components/admin/OnboardingSectionViewer.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/admin/OnboardingSectionViewer'`

- [ ] **Step 3: Implement OnboardingSectionViewer**

Create `components/admin/OnboardingSectionViewer.tsx`:

```tsx
'use client'
import type { OnboardingData } from '@/lib/types'

// ── Shared helpers ────────────────────────────────────────────────────────────

function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-indigo-400 hover:underline"
      aria-label={label}
    >
      Descargar
    </a>
  )
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-neutral-400 hover:text-neutral-200 underline"
    >
      {children}
    </a>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-500">{label}</span>
      <div className="text-sm text-neutral-200">{children}</div>
    </div>
  )
}

// ── Section renderers ─────────────────────────────────────────────────────────

function BrandViewer({ data }: { data: OnboardingData['brand'] }) {
  if (!data) return null
  const items = [
    { key: 'logo_url', label: 'Logo', ariaLabel: 'Descargar logo' },
    { key: 'isologo_url', label: 'Isologo', ariaLabel: 'Descargar isologo' },
    { key: 'favicon_url', label: 'Favicon', ariaLabel: 'Descargar favicon' },
  ] as const

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        {items.map(({ key, label, ariaLabel }) => {
          const url = data[key]
          if (!url) return null
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <span className="text-xs text-neutral-500">{label}</span>
              <img
                src={url}
                alt={label}
                className="h-16 w-auto max-w-[120px] object-contain rounded-md border border-neutral-700 bg-neutral-800 p-1"
              />
              <DownloadLink href={url} label={ariaLabel} />
            </div>
          )
        })}
      </div>
      {data.brand_guide_url && (
        <Field label="Guía de marca">
          <DownloadLink href={data.brand_guide_url} label="Descargar guía de marca" />
        </Field>
      )}
    </div>
  )
}

function TypographyViewer({ data }: { data: OnboardingData['typography'] }) {
  if (!data) return null
  const rows = [
    {
      label: 'Tipografía principal',
      name: data.display_name,
      fileUrl: data.display_file_url,
      googleUrl: data.display_google_url,
    },
    {
      label: 'Tipografía de texto',
      name: data.body_name,
      fileUrl: data.body_file_url,
      googleUrl: data.body_google_url,
    },
    {
      label: 'Tipografía de acento',
      name: data.accent_name,
      fileUrl: undefined,
      googleUrl: undefined,
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      {rows.map(({ label, name, fileUrl, googleUrl }) => {
        if (!name) return null
        return (
          <Field key={label} label={label}>
            <span>{name}</span>
            {fileUrl && (
              <span className="ml-2">
                <a
                  href={fileUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:underline"
                  aria-label="Descargar archivo"
                >
                  Descargar archivo
                </a>
              </span>
            )}
            {googleUrl && (
              <span className="ml-2">
                <ExternalLink href={googleUrl}>Ver en Google Fonts ↗</ExternalLink>
              </span>
            )}
          </Field>
        )
      })}
    </div>
  )
}

function ColorsViewer({ data }: { data: OnboardingData['colors'] }) {
  if (!data || data.length === 0) return null
  return (
    <div className="flex flex-wrap gap-3">
      {data.map((color, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded border border-neutral-700 shrink-0"
            style={{ backgroundColor: color.hex }}
          />
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-neutral-300">{color.name}</span>
            <span className="text-xs text-neutral-500 font-mono">{color.hex}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ReferencesViewer({ data }: { data: OnboardingData['references'] }) {
  if (!data || data.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {data.map((ref, i) => (
        <div key={i} className="flex gap-3 items-start">
          {ref.image_url && (
            <img
              src={ref.image_url}
              alt={ref.note ?? `Referencia ${i + 1}`}
              className="h-16 w-24 object-cover rounded border border-neutral-700 shrink-0"
            />
          )}
          <div className="flex flex-col gap-1 min-w-0">
            {ref.image_url && (
              <DownloadLink href={ref.image_url} label={`Descargar referencia ${i + 1}`} />
            )}
            {!ref.image_url && ref.url && (
              <ExternalLink href={ref.url}>
                {ref.url.length > 50 ? ref.url.slice(0, 50) + '…' : ref.url}
              </ExternalLink>
            )}
            {ref.note && <span className="text-xs text-neutral-500">{ref.note}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviousSiteViewer({ data }: { data: OnboardingData['previous_site'] }) {
  if (!data) return null
  if (data.na) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-neutral-800 text-neutral-400">
        Sin sitio web anterior
      </span>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {data.url && (
        <Field label="URL del sitio anterior">
          <ExternalLink href={data.url}>{data.url}</ExternalLink>
        </Field>
      )}
      {data.likes && <Field label="Qué le gusta">{data.likes}</Field>}
      {data.dislikes && <Field label="Qué no le gusta">{data.dislikes}</Field>}
    </div>
  )
}

function ContentViewer({ data }: { data: OnboardingData['content'] }) {
  if (!data) return null
  return (
    <div className="flex flex-col gap-3">
      {data.files && data.files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-neutral-500">Archivos</span>
          {data.files.map((file, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-neutral-300 truncate">{file.name}</span>
              <a
                href={file.url}
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:underline shrink-0"
                aria-label={`Descargar ${file.name}`}
              >
                Descargar
              </a>
            </div>
          ))}
        </div>
      )}
      {data.notes && <Field label="Notas">{data.notes}</Field>}
    </div>
  )
}

function BusinessViewer({ data }: { data: OnboardingData['business'] }) {
  if (!data) return null
  return (
    <div className="flex flex-col gap-3">
      {data.industry && <Field label="Industria">{data.industry}</Field>}
      {data.audience && <Field label="Audiencia objetivo">{data.audience}</Field>}
      {data.tone && <Field label="Tono de comunicación">{data.tone}</Field>}
      {data.competitors && data.competitors.length > 0 && (
        <Field label="Competidores">
          <div className="flex flex-wrap gap-1.5">
            {data.competitors.map((c, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                {c}
              </span>
            ))}
          </div>
        </Field>
      )}
      {data.social && Object.keys(data.social).length > 0 && (
        <Field label="Redes sociales">
          <div className="flex flex-col gap-1">
            {Object.entries(data.social).map(([platform, value]) => (
              <div key={platform} className="flex gap-2 items-center">
                <span className="text-xs text-neutral-500 w-20 shrink-0">{platform}</span>
                {value.startsWith('http') ? (
                  <ExternalLink href={value}>{value}</ExternalLink>
                ) : (
                  <span className="text-sm text-neutral-300">{value}</span>
                )}
              </div>
            ))}
          </div>
        </Field>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  sectionKey: keyof import('@/lib/types').OnboardingData
  data: OnboardingData[keyof OnboardingData]
}

export default function OnboardingSectionViewer({ sectionKey, data }: Props) {
  if (!data) return null

  switch (sectionKey) {
    case 'brand':
      return <BrandViewer data={data as OnboardingData['brand']} />
    case 'typography':
      return <TypographyViewer data={data as OnboardingData['typography']} />
    case 'colors':
      return <ColorsViewer data={data as OnboardingData['colors']} />
    case 'references':
      return <ReferencesViewer data={data as OnboardingData['references']} />
    case 'previous_site':
      return <PreviousSiteViewer data={data as OnboardingData['previous_site']} />
    case 'content':
      return <ContentViewer data={data as OnboardingData['content']} />
    case 'business':
      return <BusinessViewer data={data as OnboardingData['business']} />
    default:
      return null
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run __tests__/components/admin/OnboardingSectionViewer.test.tsx
```

Expected: All tests PASS. (Ignore any pre-existing Framer test failures unrelated to this file.)

- [ ] **Step 5: Commit**

```bash
git add components/admin/OnboardingSectionViewer.tsx __tests__/components/admin/OnboardingSectionViewer.test.tsx
git commit -m "feat: add OnboardingSectionViewer component with per-section renderers"
```

---

### Task 2: Wire OnboardingSectionViewer into AdminOnboardingTab

**Files:**
- Modify: `components/admin/AdminOnboardingTab.tsx:150-154`

- [ ] **Step 1: Write a failing test confirming the old pre block is gone**

Add to `__tests__/components/admin/AdminOnboardingTab.test.tsx` (create if it doesn't exist):

```tsx
// __tests__/components/admin/AdminOnboardingTab.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AdminOnboardingTab from '@/components/admin/AdminOnboardingTab'

const mockFetch = vi.fn()
global.fetch = mockFetch

const baseProject = {
  id: 'p-1',
  stage: 'development' as const,
  project_status: 'en_desarrollo' as const,
  onboarding_data: {
    brand: { logo_url: 'https://cdn.example.com/logo.png' },
    colors: [{ name: 'Azul', hex: '#3B5BF6' }],
  },
  admin_notes: '',
  meeting_file_url: undefined,
}

describe('AdminOnboardingTab — onboarding section display', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders brand logo as an image, not raw JSON', () => {
    render(<AdminOnboardingTab clientId="c-1" project={baseProject} />)
    const img = screen.getByRole('img', { name: /logo/i })
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/logo.png')
    // Should NOT render raw JSON
    expect(screen.queryByText(/"logo_url"/)).toBeNull()
  })

  it('renders color hex code as text, not raw JSON', () => {
    render(<AdminOnboardingTab clientId="c-1" project={baseProject} />)
    expect(screen.getByText('#3B5BF6')).toBeTruthy()
    expect(screen.queryByText(/"hex"/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run __tests__/components/admin/AdminOnboardingTab.test.tsx
```

Expected: FAIL — image not found, `"logo_url"` text is present (old JSON render).

- [ ] **Step 3: Update AdminOnboardingTab**

In `components/admin/AdminOnboardingTab.tsx`, add the import at the top of the file (after the existing imports):

```tsx
import OnboardingSectionViewer from './OnboardingSectionViewer'
```

Then replace lines 150–154 (the `<pre>` block):

```tsx
// OLD — remove this:
{done && sectionData && (
  <pre className="text-xs text-neutral-500 overflow-auto max-h-24 whitespace-pre-wrap">
    {JSON.stringify(sectionData, null, 2)}
  </pre>
)}
```

```tsx
// NEW — replace with:
{done && sectionData && (
  <div className="mt-2">
    <OnboardingSectionViewer sectionKey={key} data={sectionData} />
  </div>
)}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run __tests__/components/admin/AdminOnboardingTab.test.tsx
```

Expected: Both tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: All existing tests pass. (Pre-existing Framer failures are acceptable — ignore them.)

- [ ] **Step 6: Commit**

```bash
git add components/admin/AdminOnboardingTab.tsx __tests__/components/admin/AdminOnboardingTab.test.tsx
git commit -m "feat: wire OnboardingSectionViewer into admin onboarding tab"
```
