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
    return fields.map((f: any) => {
      const rawCases = f.cases
      // Framer enum cases may be strings or objects — normalize to strings
      const cases = Array.isArray(rawCases)
        ? rawCases.map((c: any) => {
            if (typeof c === 'string') return c
            // Walk prototype chain to access getters (framer-api uses private class fields)
            const plain = toPlain(c)
            const name = plain.name ?? plain.id
            if (typeof name === 'string' && name) return name
            try { const n = c.name; if (typeof n === 'string' && n) return n } catch {}
            try { const i = c.id; if (typeof i === 'string' && i) return i } catch {}
            return String(c)
          })
        : []
      return { id: f.id, name: f.name, type: f.type, userEditable: f.userEditable, cases }
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

// Normalize enum field values from objects (EnumCase instances) to strings
function normalizeEnumValues(fieldData: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [id, entry] of Object.entries(fieldData)) {
    if (entry?.type === 'enum' && typeof entry.value === 'object' && entry.value !== null) {
      result[id] = { ...entry, value: entry.value.name ?? entry.value.id ?? null }
    } else {
      result[id] = entry
    }
  }
  return result
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
      fieldData: normalizeEnumValues(toPlain(item.fieldData ?? {})),
    }))
  })
}

// Normalize fieldData values to the format framer-api expects
function normalizeFieldData(fieldData: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [id, entry] of Object.entries(fieldData)) {
    if (!entry) { result[id] = entry; continue }
    const { type, value } = entry
    switch (type) {
      case 'image':
      case 'file':
        // framer-api expects a URL string, not an object
        result[id] = { type, value: typeof value === 'object' && value !== null ? (value.url ?? null) : value }
        break
      case 'array':
        // gallery: array of {url} objects → array of URL strings
        result[id] = { type, value: Array.isArray(value) ? value.map((v: any) => typeof v === 'object' ? (v.url ?? v) : v) : value }
        break
      case 'enum':
        // enum value may be an object (EnumCase) — extract the name string
        result[id] = { type, value: typeof value === 'object' && value !== null ? (value.name ?? value.id ?? null) : value }
        break
      default:
        result[id] = entry
    }
  }
  return result
}

// The canvas setCollectionItemAttributes2 / addCollectionItems2 handlers treat enum
// fieldData entries as raw case values, not {type,value} typed wrappers.  Passing a
// typed wrapper causes String({...}) = "[object Object]" in the canvas enum validator.
// Unwrap only enum entries to their plain string value; all other types stay wrapped.
function unwrapEnumEntries(fieldData: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [id, entry] of Object.entries(fieldData)) {
    if (entry?.type === 'enum') {
      result[id] = entry.value ?? null
    } else {
      result[id] = entry
    }
  }
  return result
}

export async function updateItemAndPublish(
  projectUrl: string,
  apiKey: string,
  collectionId: string,
  item: FramerItem
): Promise<void> {
  await withFramer(projectUrl, apiKey, async (framer) => {
    const normalized = normalizeFieldData(item.fieldData)

    // Try ManagedCollection first (plugin-managed CMS collections).
    const managedCols = await framer.getManagedCollections()
    const managedCol = managedCols.find((c: any) => c.id === collectionId)
    if (managedCol) {
      await managedCol.addItems([{ ...item, fieldData: normalized } as any])
    } else {
      // Regular (manually-managed) collection: use CollectionItem.setAttributes.
      // The canvas handler expects enum values as raw strings, not {type,value} wrappers.
      const cols = await framer.getCollections()
      const col = cols.find((c: any) => c.id === collectionId)
      if (!col) throw new Error(`Collection ${collectionId} not found`)

      const collectionItems = await col.getItems()
      const collectionItem = collectionItems.find((ci: any) => ci.id === item.id)
      if (!collectionItem) throw new Error(`Item ${item.id} not found in collection ${collectionId}`)

      const fieldData = unwrapEnumEntries(normalized)
      await collectionItem.setAttributes({ slug: item.slug, draft: item.draft, fieldData } as any)
    }

    const published = await framer.publish()
    await framer.deploy(published.deployment.id)
  })
}
