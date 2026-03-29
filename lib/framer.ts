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
            // Try common property names used by framer-api
            return c?.name ?? c?.value ?? c?.id ?? String(c)
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
      fieldData: toPlain(item.fieldData ?? {}),
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
    await col.addItems([item as any])
    const published = await framer.publish()
    await framer.deploy(published.deployment.id)
  })
}
