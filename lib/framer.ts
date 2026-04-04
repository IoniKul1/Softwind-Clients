import { connect } from 'framer-api'
import type { FramerCollection, FramerEnumCase, FramerField, FramerItem } from './types'

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
    return fields.map((f: any) => {
      const rawCases = f.cases
      // Return {id, name} objects — the canvas requires the case ID when writing back
      const cases: FramerEnumCase[] = Array.isArray(rawCases)
        ? rawCases.map((c: any) => {
            if (typeof c === 'string') return { id: c, name: c }
            const plain = toPlain(c)
            const id = (typeof plain.id === 'string' && plain.id) ? plain.id
              : (() => { try { const i = c.id; if (typeof i === 'string' && i) return i } catch {} return String(c) })()
            const name = (typeof plain.name === 'string' && plain.name) ? plain.name
              : (() => { try { const n = c.name; if (typeof n === 'string' && n) return n } catch {} return id })()
            return { id, name }
          })
        : []
      return { id: f.id, name: f.name, type: f.type, userEditable: f.userEditable, required: f.required ?? false, cases }
    })
  })
}

// Recursively convert framer-api class instances to plain objects.
// Framer uses non-enumerable prototype properties, so we walk the chain.
function toPlain(v: any): any {
  if (v === null || v === undefined) return v
  if (typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(toPlain)

  const result: Record<string, any> = {}
  let proto = v
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor' || key in result) continue
      try {
        const val = v[key]
        if (typeof val !== 'function') result[key] = toPlain(val)
      } catch {}
    }
    proto = Object.getPrototypeOf(proto)
  }
  return result
}

// Build name→id map for enum cases from raw field list.
function buildEnumNameToId(fields: any[]): Record<string, Record<string, string>> {
  const enumNameToId: Record<string, Record<string, string>> = {}
  for (const f of fields) {
    if (f.type !== 'enum' || !Array.isArray(f.cases)) continue
    const map: Record<string, string> = {}
    for (const c of f.cases) {
      const plain = toPlain(c)
      const id = (typeof plain.id === 'string' && plain.id) ? plain.id : String(c)
      const name = (typeof plain.name === 'string' && plain.name) ? plain.name : id
      map[name] = id
    }
    enumNameToId[f.id] = map
  }
  return enumNameToId
}

// Map raw items to FramerItem[], converting enum names to IDs.
function mapItems(items: any[], enumNameToId: Record<string, Record<string, string>>): FramerItem[] {
  return items.map((item: any) => {
    const raw = toPlain(item.fieldData ?? {})
    const fieldData: Record<string, any> = {}
    for (const [fid, entry] of Object.entries(raw) as [string, any][]) {
      if (entry?.type === 'enum') {
        let val = entry.value
        if (val && typeof val === 'object') {
          const plain = toPlain(val)
          val = plain.id ?? plain.name ?? null
        }
        if (typeof val === 'string' && enumNameToId[fid]?.[val]) {
          val = enumNameToId[fid][val]
        }
        fieldData[fid] = { ...entry, value: val }
      } else {
        fieldData[fid] = entry
      }
    }
    return { id: item.id, slug: item.slug, draft: item.draft, fieldData }
  })
}

// Fetch only slugs/draft status — no field definitions needed for list views.
export async function getItemsMeta(
  projectUrl: string,
  apiKey: string,
  collectionId: string
): Promise<Pick<FramerItem, 'id' | 'slug' | 'draft'>[]> {
  return withFramer(projectUrl, apiKey, async (framer) => {
    const cols = await framer.getCollections()
    const col = cols.find((c: any) => c.id === collectionId)
    if (!col) throw new Error(`Collection ${collectionId} not found`)
    const items = await col.getItems()
    return items.map((item: any) => ({ id: item.id, slug: item.slug, draft: item.draft }))
  })
}

// Fetch fields and items in a single connection — use this on edit/create pages
// that need both, instead of calling getCollectionFields + getItems separately.
export async function getCollectionData(
  projectUrl: string,
  apiKey: string,
  collectionId: string
): Promise<{ fields: FramerField[]; items: FramerItem[] }> {
  return withFramer(projectUrl, apiKey, async (framer) => {
    const cols = await framer.getCollections()
    const col = cols.find((c: any) => c.id === collectionId)
    if (!col) throw new Error(`Collection ${collectionId} not found`)

    const rawFields = await col.getFields()
    const enumNameToId = buildEnumNameToId(rawFields)

    const fields: FramerField[] = (rawFields as any[]).map((f: any) => {
      const rawCases = f.cases
      const cases: FramerEnumCase[] = Array.isArray(rawCases)
        ? rawCases.map((c: any) => {
            if (typeof c === 'string') return { id: c, name: c }
            const plain = toPlain(c)
            const id = (typeof plain.id === 'string' && plain.id) ? plain.id
              : (() => { try { const i = c.id; if (typeof i === 'string' && i) return i } catch {} return String(c) })()
            const name = (typeof plain.name === 'string' && plain.name) ? plain.name
              : (() => { try { const n = c.name; if (typeof n === 'string' && n) return n } catch {} return id })()
            return { id, name }
          })
        : []
      return { id: f.id, name: f.name, type: f.type, userEditable: f.userEditable, required: f.required ?? false, cases }
    })

    const rawItems = await col.getItems()
    const items = mapItems(rawItems, enumNameToId)

    return { fields, items }
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
    const rawFields = await col.getFields()
    const enumNameToId = buildEnumNameToId(rawFields)
    const items = await col.getItems()
    return mapItems(items, enumNameToId)
  })
}

// Normalize fieldData values to the format framer-api expects
function normalizeFieldData(fieldData: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [id, entry] of Object.entries(fieldData)) {
    if (!entry) { result[id] = entry; continue }
    const { type, value } = entry
    switch (type) {
      case 'formattedText':
        // Strip valueByLocale (read format) — write only accepts { type, value, contentType }
        result[id] = { type: 'formattedText', value: typeof value === 'string' ? value : '', contentType: (entry as any).contentType ?? 'html' }
        break
      case 'image':
      case 'file':
        // framer-api expects a URL string, not an object
        result[id] = { type, value: typeof value === 'object' && value !== null ? (value.url ?? null) : value }
        break
      case 'array':
        // gallery: array of {url} objects → array of URL strings
        result[id] = { type, value: Array.isArray(value) ? value.map((v: any) => typeof v === 'object' ? (v.url ?? v) : v) : value }
        break
      case 'link':
        // canvas expects a URL string, not a {url, label} object
        result[id] = { type, value: typeof value === 'object' && value !== null ? (value.url ?? null) : value }
        break
      case 'enum':
        // enum value may be an object (EnumCase) — extract the case ID (canvas requires ID, not name)
        result[id] = { type, value: typeof value === 'object' && value !== null ? (value.id ?? value.name ?? null) : value }
        break
      default:
        // Strip valueByLocale from any field — read format includes it but write doesn't accept it
        if ((entry as any).valueByLocale !== undefined) {
          const { valueByLocale: _, ...clean } = entry as any
          result[id] = clean
        } else {
          result[id] = entry
        }
    }
  }
  return result
}

export async function createItemAndPublish(
  projectUrl: string,
  apiKey: string,
  collectionId: string,
  item: { slug: string; draft?: boolean; fieldData: Record<string, any> }
): Promise<void> {
  await withFramer(projectUrl, apiKey, async (framer) => {
    const fieldData = normalizeFieldData(item.fieldData)

    // Strip null/undefined values — canvas throws "Failed to construct URL"
    // when it receives null for image/file/date/number fields on create.
    const cleanFieldData: Record<string, any> = {}
    for (const [id, entry] of Object.entries(fieldData)) {
      if (entry != null && entry.value != null) cleanFieldData[id] = entry
    }

    const managedCols = await framer.getManagedCollections()
    const managedCol = managedCols.find((c: any) => c.id === collectionId)
    if (managedCol) {
      await managedCol.addItems([{ slug: item.slug, draft: item.draft ?? false, fieldData: cleanFieldData } as any])
    } else {
      const cols = await framer.getCollections()
      const col = cols.find((c: any) => c.id === collectionId)
      if (!col) throw new Error(`Collection ${collectionId} not found`)
      await (col as any).addItems([{ slug: item.slug, draft: item.draft ?? false, fieldData: cleanFieldData }])
    }

    const published = await framer.publish()
    await framer.deploy(published.deployment.id).catch(() => {})
  })
}

export async function deleteItemAndPublish(
  projectUrl: string,
  apiKey: string,
  collectionId: string,
  itemId: string
): Promise<void> {
  await withFramer(projectUrl, apiKey, async (framer) => {
    const managedCols = await framer.getManagedCollections()
    const managedCol = managedCols.find((c: any) => c.id === collectionId)
    if (managedCol) {
      await managedCol.removeItems([itemId])
    } else {
      const cols = await framer.getCollections()
      const col = cols.find((c: any) => c.id === collectionId)
      if (!col) throw new Error(`Collection ${collectionId} not found`)
      await (col as any).removeItems([itemId])
    }

    const published = await framer.publish()
    await framer.deploy(published.deployment.id).catch(() => {})
  })
}

export async function updateItemAndPublish(
  projectUrl: string,
  apiKey: string,
  collectionId: string,
  item: FramerItem
): Promise<void> {
  await withFramer(projectUrl, apiKey, async (framer) => {
    const fieldData = normalizeFieldData(item.fieldData)

    // Try ManagedCollection first (plugin-managed CMS collections).
    const managedCols = await framer.getManagedCollections()
    const managedCol = managedCols.find((c: any) => c.id === collectionId)
    if (managedCol) {
      await managedCol.addItems([{ ...item, fieldData } as any])
    } else {
      // Regular (manually-managed) collection: use CollectionItem.setAttributes.
      const cols = await framer.getCollections()
      const col = cols.find((c: any) => c.id === collectionId)
      if (!col) throw new Error(`Collection ${collectionId} not found`)

      const collectionItems = await col.getItems()
      const collectionItem = collectionItems.find((ci: any) => ci.id === item.id)
      if (!collectionItem) throw new Error(`Item ${item.id} not found in collection ${collectionId}`)

      await collectionItem.setAttributes({ slug: item.slug, draft: item.draft, fieldData } as any)
    }

    const published = await framer.publish()
    await framer.deploy(published.deployment.id).catch(() => {})
  })
}
