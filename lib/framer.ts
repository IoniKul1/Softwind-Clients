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

// Recursively convert framer-api class instances to plain objects
function toPlain(v: any): any {
  if (v === null || v === undefined) return v
  if (typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(toPlain)
  return Object.fromEntries(
    Object.entries(Object.assign({}, v)).map(([k, val]) => [k, toPlain(val)])
  )
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
