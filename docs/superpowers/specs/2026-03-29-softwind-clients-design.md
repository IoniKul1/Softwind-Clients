# Softwind Clients — CMS Portal — Design Spec

## Goal

A private web portal for Softwind clients to edit the CMS content of their Framer websites, without needing access to Framer or Google Sheets. Changes are published automatically to their live site via the Framer Server API.

## Architecture

```
[Client / Admin] → Next.js App (Vercel)
                        ↓
                   Supabase Auth + Postgres
                   (user accounts, project configs)
                        ↓
                   Framer Server API (framer-api npm)
                   read collections → update items → publish
                        ↓
                   Cloudflare R2
                   (image/file uploads)
```

**Tech Stack:**
- Next.js 16 App Router + TypeScript + Tailwind CSS v4
- Supabase (email/password auth + Postgres DB)
- `framer-api` npm (WebSocket, Node.js runtime only — not Edge)
- Cloudflare R2 (media uploads, same as curva-demo-generator)
- TipTap (rich text editor for formattedText fields)
- Vitest (unit tests)
- Vercel (hosting)

---

## User Roles

### Admin (Softwind team)
- Accesses `/admin` — protected by `role = admin`
- Creates and manages client accounts
- Links each client to their Framer project (URL + API key)
- Can deactivate clients without deleting data

### Client
- Accesses `/` — protected by `role = client`
- Sees only their own project's CMS collections
- Edits items and publishes — never sees other clients' data or Framer credentials

---

## Database Schema (Supabase Postgres)

### `profiles`
| column | type | notes |
|---|---|---|
| id | uuid | references auth.users |
| role | text | `admin` or `client` |
| name | text | display name |
| created_at | timestamptz | |

### `projects`
| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| client_user_id | uuid | references profiles.id |
| name | text | display name for the project |
| framer_project_url | text | e.g. `https://framer.com/projects/...` |
| framer_api_key_encrypted | text | AES-256 encrypted, decrypted server-side only |
| created_at | timestamptz | |

**Security:** Framer API keys are encrypted at rest using AES-256 (`node:crypto`). They are decrypted only in Server Actions / API routes — never exposed to the client.

---

## Pages

| Route | Who | Description |
|---|---|---|
| `/login` | All | Email + password login |
| `/` | Client | Lists CMS collections for their project |
| `/collections/[id]` | Client | Lists items in a collection |
| `/collections/[id]/[itemId]` | Client | Edit form for a single item |
| `/admin` | Admin | List of all clients + status |
| `/admin/clients/new` | Admin | Create new client |
| `/admin/clients/[id]` | Admin | Edit client / project config |

---

## Content Editing UI

The portal reads field definitions from Framer API on each collection page load and auto-generates the form. No manual field configuration needed.

### Field Type → Input Component

| Framer field type | Form component |
|---|---|
| `string` | Text input |
| `formattedText` | TipTap rich text editor (markdown or HTML) |
| `number` | Number input |
| `date` | Date picker |
| `boolean` | Toggle switch |
| `color` | Color picker (`<input type="color">`) |
| `image` | File upload → client-side compression → R2 → URL |
| `file` | File upload → R2 → URL |
| `link` | Two inputs: URL + label |
| `enum` | Select dropdown (options from field definition) |
| `array` / gallery | Multi-upload (images), list of R2 URLs |

### Save flow
1. Client edits fields and clicks "Guardar y publicar"
2. Portal calls Framer `addItems()` with updated fieldData
3. Portal calls `framer.publish()` → `framer.deploy(deploymentId)`
4. Toast: "Cambios publicados ✓"
5. On error: toast with error message, no partial publish

---

## Media Uploads

- Images: compressed client-side to WebP (max 2048px, quality 0.82) before upload — same logic as curva-demo-generator
- Videos and other files: uploaded directly to R2 via presigned PUT URL
- R2 keys: `{clientSlug}/collections/{collectionId}/{fieldId}/{filename}`
- Public R2 URL is stored as the field value passed to Framer

---

## Admin Panel

- `/admin` — table with all clients: name, email, project name, status (active/inactive), last login
- `/admin/clients/new` — form: client name, email, temporary password, project name, Framer project URL, Framer API key
- `/admin/clients/[id]` — same form for editing; toggle to deactivate account

---

## Auth & Middleware

- Supabase Auth handles sessions (JWT cookies)
- Next.js middleware checks session on every request:
  - No session → redirect to `/login`
  - `role = client` accessing `/admin/*` → redirect to `/`
  - `role = admin` accessing `/` → redirect to `/admin`
- `/login` is public

---

## Out of Scope (Sub-project 2)

- Email notifications to Softwind team when client saves changes
- Video compression
- Multiple Framer projects per client
