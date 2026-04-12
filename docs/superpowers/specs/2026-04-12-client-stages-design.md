# Client Stages: Development & Production

**Date:** 2026-04-12  
**Status:** Approved

---

## Overview

Clients progress through two stages in the platform:

1. **Development** — The website is being built. The client gets access to upload branding assets and track project status. CMS, analytics, and change requests are hidden.
2. **Production/Maintenance** — The website is live. The client gets full access to CMS, analytics, change requests, and (future) performance metrics.

The admin manually transitions a client from Development to Production by setting a field in the admin panel.

---

## Database Changes

**Table: `projects`** — new columns added:

```sql
stage            text  DEFAULT 'development'
-- values: 'development' | 'production'

project_status   text  DEFAULT 'pago_recibido'
-- values: 'pago_recibido' | 'en_desarrollo' | 'esperando_feedback' | 'entregado'

onboarding_data  jsonb DEFAULT '{}'
-- structure:
-- {
--   "brand": { "logo_url": "", "isologo_url": "", "favicon_url": "", "brand_guide_url": "" },
--   "typography": { "display_name": "", "display_url": "", "body_name": "", "body_url": "", "accent_name": "" },
--   "colors": [{ "name": "Primario", "hex": "#6366f1" }],
--   "references": [{ "url": "", "image_url": "", "note": "" }],
--   "previous_site": { "url": "", "likes": "", "dislikes": "", "screenshots": [] },
--   "content": { "files": [], "notes": "" },
--   "business": { "industry": "", "audience": "", "competitors": [], "social": {}, "tone": "" }
-- }

admin_notes      text
-- Internal notes visible only to admins

meeting_file_url text
-- S3 URL for meeting transcript file (PDF/DOCX/TXT/MP3), admin-only
```

No new tables required.

---

## Project Status Flow

The `project_status` field follows this flow, managed exclusively by the admin:

```
pago_recibido → en_desarrollo ⇄ esperando_feedback → entregado
```

- The cycle between `en_desarrollo` and `esperando_feedback` can repeat N times.
- When the admin sets status to `entregado`, a confirmation prompt appears before also flipping `stage` to `production`.

---

## Onboarding Sections (7 total)

The client fills in sections 1–7. The admin fills in the admin-only section.

| # | Section | Client fills | Content |
|---|---------|-------------|---------|
| 01 | Identidad de Marca | ✓ | Logo PNG, Isologo PNG/SVG, Favicon, Brand guide PDF (optional) |
| 02 | Tipografías | ✓ | Display font name/file/URL, Body font name/file/URL, Accent font (optional) |
| 03 | Paleta de Colores | ✓ | N colors with name + HEX value (primary, secondary, accent, neutrals) |
| 04 | Referencias Visuales | ✓ | URLs of sites they like, inspiration images, per-reference note |
| 05 | Sitio Web Anterior | ✓ | URL of current site (if any), what they like/dislike, screenshots (optional) |
| 06 | Contenido y Copy | ✓ | Text files (DOCX/PDF), own photos/images, videos |
| 07 | Info del Negocio | ✓ | Industry, target audience, competitor URLs, social media handles, tone of voice |
| — | Transcript de Reunión | Admin only | Meeting file (PDF/DOCX/TXT/MP3) + internal free-text notes — not visible to client |

A section is considered **complete** when the client has saved it at least once (any field filled and submitted). "Sitio Web Anterior" can be marked as N/A if the client has no previous site — this also counts as complete. Progress bar shows X of 7 sections completed.

---

## Navigation & Routing

### Client sidebar — Development stage
Only shows:
- `/onboarding` — Onboarding panel (default home in this stage)

Routes `/collections`, `/analytics`, `/requests` are hidden and blocked by middleware.

### Client sidebar — Production stage
Shows existing routes (no change):
- `/collections` — CMS
- `/analytics` — Analytics  
- `/requests` — Solicitudes de cambio

### New routes

| Route | Who | Purpose |
|-------|-----|---------|
| `/onboarding` | Client | Main page for development stage |
| `/admin/clients/[id]/onboarding` | Admin | View client onboarding data + admin controls |

---

## Components

### Client-side

**`OnboardingPage`** (`/app/onboarding/page.tsx`)  
Main page for development stage. Renders `ProjectTimeline` and `OnboardingChecklist` side by side.

**`ProjectTimeline`** (`/components/onboarding/ProjectTimeline.tsx`)  
Displays the 4 project statuses as a vertical stepper. Read-only for the client. Completed steps show green check, active step is highlighted in indigo, pending steps are grey. The `en_desarrollo ⇄ esperando_feedback` cycle is visually indicated.

**`OnboardingChecklist`** (`/components/onboarding/OnboardingChecklist.tsx`)  
Lists all 7 sections with completion status (complete/pending) and a progress bar (X of 7). Each item is clickable and expands or navigates to the section form.

**`OnboardingSection`** (`/components/onboarding/OnboardingSection.tsx`)  
Generic component used for each of the 7 sections. Renders fields according to type:
- File upload (logo, fonts, content files) → uses existing S3 upload endpoint
- Text input (font name, tone of voice, etc.)
- HEX color picker with label (colors section)
- URL + note pairs (references, competitors)
- Textarea (likes/dislikes, notes)

Saves to `onboarding_data` via `PATCH /api/onboarding` on submit.

### Admin-side

**`AdminOnboardingTab`** (`/components/admin/AdminOnboardingTab.tsx`)  
New tab in `/admin/clients/[id]`. Shows all 7 client sections in read-only view. Also contains admin-only fields: meeting file upload, internal notes textarea, `ProjectStatusSelector`, and stage toggle button.

**`ProjectStatusSelector`** (`/components/admin/ProjectStatusSelector.tsx`)  
Dropdown or stepper for the admin to move `project_status`. When selecting `entregado`, shows a confirmation dialog before saving and setting `stage = 'production'`.

---

## API Routes

**`PATCH /api/onboarding`**  
Updates a single section of `onboarding_data` for the authenticated client's project. Merges the provided section object into the existing JSONB. Requires client role.

**`PATCH /api/project-status`**  
Updates `project_status` and optionally `stage` on a project. Requires admin role. When `stage` is set to `production`, also validates that `project_status = 'entregado'`.

**`POST /api/upload`** (existing)  
Reused for all file uploads (logos, fonts, transcript, content files) → S3.

---

## Middleware

The existing middleware (`/middleware.ts`) must be extended to:
- Check `stage` from the user's project when a client accesses a route
- If `stage = 'development'`, redirect `/collections`, `/analytics`, `/requests` to `/onboarding`
- If `stage = 'production'`, redirect `/onboarding` to `/collections` (no longer needed)

The `stage` value should be stored in the Supabase session or fetched server-side per request.

---

## Out of scope

- Email notifications when project status changes (future)
- Core Web Vitals / PageSpeed panel (future — planned for production stage)
- Client-visible feedback thread on the onboarding (future)
