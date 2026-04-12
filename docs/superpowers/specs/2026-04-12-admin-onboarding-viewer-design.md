# Admin Onboarding Viewer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace raw JSON display in the admin onboarding tab with a human-readable, per-section renderer that shows fields with labels and provides individual download buttons for every uploaded file.

**Architecture:** A single new client component `OnboardingSectionViewer` receives a section key and its data, and renders a type-specific layout. `AdminOnboardingTab` replaces its existing `<pre>JSON.stringify(...)` block with this component.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS, TypeScript. No API or schema changes.

---

## Data Types Reference

```typescript
// Exact field names from lib/types.ts

OnboardingBrand:       logo_url?, isologo_url?, favicon_url?, brand_guide_url?
OnboardingTypography:  display_name?, display_file_url?, display_google_url?,
                       body_name?, body_file_url?, body_google_url?, accent_name?
OnboardingColor[]:     { name: string, hex: string }
OnboardingReference[]: { url?, image_url?, note? }
OnboardingPreviousSite: { na?, url?, likes?, dislikes? }
OnboardingContent:     { files?: Array<{ url: string; name: string }>, notes? }
OnboardingBusiness:    { industry?, audience?, competitors?: string[], social?: Record<string,string>, tone? }
```

---

## Section Renderer Designs

### `brand`
- Show logo, isologo, favicon as `<img>` previews (max-h-24, object-contain, neutral-800 bg).
- Each image: label above + "Descargar" link (`<a href={url} download target="_blank">`).
- `brand_guide_url`: no image preview — show filename extracted from URL + "Descargar" link.
- Skip any field that is undefined/empty.

### `typography`
- Three rows: "Tipografía principal", "Tipografía de texto", "Tipografía de acento".
- For each: show name as text. If `*_file_url` exists: "Descargar archivo" link. If `*_google_url` exists: "Ver en Google Fonts ↗" link (opens in new tab, no download).
- Skip accent row if `accent_name` is empty.

### `colors`
- Horizontal wrapping grid of chips.
- Each chip: square swatch (w-8 h-8 rounded, backgroundColor: hex) + name + hex code.
- No download — colors are not files.

### `references`
- List, one item per reference.
- If `image_url`: show thumbnail (max-h-20, object-cover) + "Descargar" link.
- If only `url` (no `image_url`): show URL as clickable link (open in new tab).
- If `note`: show below as light text.

### `previous_site`
- If `na === true`: show "Sin sitio web anterior" pill.
- Otherwise: show `url` as a clickable link. Show `likes` and `dislikes` as labeled text blocks if non-empty.

### `content`
- Files list: each item shows `name` + "Descargar" link (using `url`).
- `notes`: show as paragraph below files.

### `business`
- Labeled fields: Industria, Audiencia objetivo, Tono de comunicación — each as a `<p>`.
- `competitors`: rendered as a comma-separated list or small chips.
- `social`: each key-value as "Platform: handle/url" rows. Values that look like URLs are rendered as links.

---

## Download Link Behavior

All download links use:
```html
<a href={url} download target="_blank" rel="noopener noreferrer">
  Descargar
</a>
```

For files where we want a specific filename (brand guide, content files), use the `name` field if available, or extract from URL path as fallback. The `download` attribute only works for same-origin URLs; for R2/CDN URLs the browser will follow the link in a new tab — this is acceptable behavior.

---

## File Structure

- **Create:** `components/admin/OnboardingSectionViewer.tsx`
  - Default export: `OnboardingSectionViewer({ sectionKey, data })`
  - Internal sub-components (not exported): `BrandViewer`, `TypographyViewer`, `ColorsViewer`, `ReferencesViewer`, `PreviousSiteViewer`, `ContentViewer`, `BusinessViewer`
  - Each sub-component receives only the typed slice of data it needs
- **Modify:** `components/admin/AdminOnboardingTab.tsx`
  - In the "Información del Cliente" section, replace `<pre>{JSON.stringify(sectionData, null, 2)}</pre>` with `<OnboardingSectionViewer sectionKey={key} data={sectionData} />`

---

## Visual Style

Consistent with the rest of the admin UI:
- Labels: `text-xs text-neutral-500`
- Values: `text-sm text-neutral-200`
- Download links: `text-xs text-indigo-400 hover:underline`
- External links: `text-xs text-neutral-400 hover:text-neutral-200`
- Section rows separated by `gap-3` within a `flex flex-col`
- Image previews: `rounded-md border border-neutral-700 bg-neutral-800 object-contain max-h-24`
