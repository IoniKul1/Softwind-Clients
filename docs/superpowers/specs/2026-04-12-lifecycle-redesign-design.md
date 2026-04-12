# Client Lifecycle Redesign + Onboarding Self-Service Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the client lifecycle to: (1) unlock CMS for development clients who complete onboarding, (2) split delivery into "sin mantenimiento" (completion screen only) vs "con mantenimiento" (full package), and (3) let production-with-maintenance clients re-edit their onboarding data.

**Architecture:** Two DB schema additions drive everything downstream. The middleware expands its DB query to read `stage`, `project_status`, and `onboarding_complete`, then routes clients to the right experience. The admin delivery confirmation splits into two paths. The client sidebar renders different nav items based on a computed `mode` string.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL, TypeScript, Tailwind CSS, Vitest.

---

## Data Model

### New column: `onboarding_complete`
```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;
```
Set to `true` by the `/api/onboarding` endpoint whenever the saved section results in all 7 sections being complete (recomputed on every save).

### Updated `project_status` CHECK constraint
```sql
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

Legacy `entregado` is kept for backward compatibility and treated as `entregado_con_mantenimiento` throughout the app.

---

## TypeScript Types (`lib/types.ts`)

```typescript
export type ProjectStatus =
  | 'pago_recibido'
  | 'en_desarrollo'
  | 'esperando_feedback'
  | 'entregado'
  | 'entregado_sin_mantenimiento'
  | 'entregado_con_mantenimiento'

// Add to Project interface:
onboarding_complete: boolean
```

---

## Middleware Routing Table (`middleware.ts`)

The middleware selects `stage`, `project_status`, `onboarding_complete` from `projects`.

| Condition | Allowed routes | Root redirect |
|---|---|---|
| `stage = 'development'`, `onboarding_complete = false` | `/onboarding/**` | → `/onboarding` |
| `stage = 'development'`, `onboarding_complete = true` | `/onboarding/**`, `/collections/**` | → `/onboarding` |
| `stage = 'production'`, status = `entregado_sin_mantenimiento` | `/completed` only | → `/completed` |
| `stage = 'production'`, other status (con mantenimiento / legacy entregado) | all routes incl. `/onboarding/**` | → `/collections` |

Development clients always blocked from `/analytics`, `/requests`, `/completed`.
Production-full clients always blocked from `/completed`.
Production-sin-mantenimiento clients redirected from everything except `/completed`.

---

## Client Sidebar (`components/ClientSidebar.tsx`)

Replace `stage: ProjectStage` prop with:
```typescript
type SidebarMode = 'dev_incomplete' | 'dev_complete' | 'production_full'
```

Nav items per mode:
- `dev_incomplete` → "Mi Sitio" → `/onboarding`
- `dev_complete` → "Mi Sitio" → `/onboarding`, "Content Manager" → `/collections`
- `production_full` → "Onboarding" → `/onboarding`, "Content Manager" → `/collections`, "Analytics" → `/analytics` (beta), "Pedidos de cambios" → `/requests`

Status dot:
- `dev_incomplete` or `dev_complete` → amber + "En desarrollo" badge
- `production_full` → green dot (no badge)

---

## Client Route Layouts

All five layouts (`onboarding`, `collections`, `analytics`, `requests`, `completed`) fetch:
```sql
SELECT name, website_url, onboarding_complete, project_status, stage FROM projects
WHERE client_user_id = user.id
```

They compute `mode: SidebarMode` and pass it to `ClientSidebar`.

Helper function (shared in `lib/sidebar.ts`):
```typescript
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

The `/completed` layout does NOT render `ClientSidebar` — it's a full-screen page.

---

## Completion Screen (`app/completed/`)

### `app/completed/layout.tsx`
Server component. Verifies auth, verifies client is `entregado_sin_mantenimiento` (else redirect). Renders `children` with no sidebar.

### `app/completed/page.tsx`
Server component. Fetches `website_url` and `name` from projects.

Renders:
```
🎉 ¡Listo! Tu sitio está publicado.

[website_url as a large clickable link]

¿Consultas? Escribinos por WhatsApp:
+54 9 11 7066-1032  (link: https://wa.me/5491170661032)
```

---

## Admin: Delivery Bifurcation (`components/admin/ProjectStatusSelector.tsx`)

When admin selects `entregado_sin_mantenimiento` or `entregado_con_mantenimiento` (replace single `entregado` option), show confirmation dialog with TWO buttons:

```
Elegir tipo de entrega:
[Listo sin mantenimiento] → stage: 'production', status: 'entregado_sin_mantenimiento'
[Listo con mantenimiento] → stage: 'production', status: 'entregado_con_mantenimiento'
```

Remove `entregado` from the selectable options (keep in type for backward compat). The STATUS_LABELS map updates to show human-readable labels for both new values.

---

## Onboarding API (`app/api/onboarding/route.ts`)

After updating `onboarding_data`, recompute completion:
```typescript
import { ONBOARDING_SECTIONS, isSectionComplete } from '@/lib/onboarding'
const allComplete = ONBOARDING_SECTIONS.every(s => isSectionComplete(updated as OnboardingData, s.key))
// Update both onboarding_data and onboarding_complete in one PATCH
await adminClient.from('projects').update({
  onboarding_data: updated,
  onboarding_complete: allComplete,
}).eq('id', project.id)
```

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
| Modify | `components/admin/ProjectStatusSelector.tsx` |
