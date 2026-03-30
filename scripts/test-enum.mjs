/**
 * Diagnostic script: dumps enum case IDs, names, and item field values
 * from the Framer collection to determine the correct write format.
 *
 * Usage:
 *   FRAMER_PROJECT_URL="https://..." FRAMER_API_KEY="..." node scripts/test-enum.mjs
 *
 * Get the project URL and API key from your Supabase `projects` table
 * (decrypt framer_api_key_encrypted using your ENCRYPTION_KEY).
 */

import { connect } from 'framer-api'

const PROJECT_URL = process.env.FRAMER_PROJECT_URL
const API_KEY = process.env.FRAMER_API_KEY
const COLLECTION_ID = process.env.FRAMER_COLLECTION_ID || 'gI_wZVN0O'

if (!PROJECT_URL || !API_KEY) {
  console.error('Set FRAMER_PROJECT_URL and FRAMER_API_KEY env vars')
  process.exit(1)
}

function toPlain(v) {
  if (v === null || v === undefined) return v
  if (typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(toPlain)
  const result = {}
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

const framer = await connect(PROJECT_URL, API_KEY)

try {
  const cols = await framer.getCollections()
  const col = cols.find(c => c.id === COLLECTION_ID)
  if (!col) { console.error('Collection not found'); process.exit(1) }

  // --- Fields ---
  const fields = await col.getFields()
  const enumFields = fields.filter(f => f.type === 'enum')
  console.log('\n=== ENUM FIELDS ===')
  for (const f of enumFields) {
    console.log(`\nField: ${f.name} (id=${f.id})`)
    const cases = f.cases ?? []
    for (const c of cases) {
      const plain = toPlain(c)
      console.log(`  case plain:`, JSON.stringify(plain))
      // Also try direct property access
      try { console.log(`  case.id=${c.id}  case.name=${c.name}`) } catch(e) {}
    }
  }

  // --- Items (first 3) ---
  const items = await col.getItems()
  console.log(`\n=== FIRST 3 ITEMS (enum fields only) ===`)
  for (const item of items.slice(0, 3)) {
    console.log(`\nItem: ${item.slug} (id=${item.id})`)
    for (const f of enumFields) {
      const rawEntry = item.fieldData[f.id]
      const plain = toPlain(rawEntry)
      console.log(`  field=${f.name}: raw entry plain =`, JSON.stringify(plain))
      try { console.log(`  entry.type=${rawEntry?.type}  entry.value type=${typeof rawEntry?.value}  entry.value=`, rawEntry?.value) } catch(e) {}
      if (rawEntry?.value && typeof rawEntry.value === 'object') {
        try { console.log(`  value.id=${rawEntry.value.id}  value.name=${rawEntry.value.name}`) } catch(e) {}
      }
    }
  }

  // --- Attempt a write with ONLY the enum field ---
  const testItem = items[0]
  if (testItem && enumFields.length > 0) {
    const ef = enumFields[0]
    const rawVal = testItem.fieldData[ef.id]
    const plainVal = toPlain(rawVal)
    console.log('\n=== WRITE TEST ===')
    console.log('Will attempt setAttributes with enum field using different formats:')

    // Format 1: typed entry with id from plain
    const caseId = plainVal?.value?.id
    const caseName = plainVal?.value?.name ?? plainVal?.value
    console.log(`caseId from plain: ${caseId}`)
    console.log(`caseName from plain: ${caseName}`)

    // Try the collectionItem directly
    const collectionItem = items.find(ci => ci.id === testItem.id)
    if (collectionItem?.setAttributes) {
      // Test: typed entry with case ID
      try {
        await collectionItem.setAttributes({
          slug: testItem.slug,
          fieldData: { [ef.id]: { type: 'enum', value: caseId } }
        })
        console.log('SUCCESS with typed entry + caseId:', caseId)
      } catch (e) {
        console.log('FAIL typed entry + caseId:', e.message)
      }

      // Test: typed entry with case name
      try {
        await collectionItem.setAttributes({
          slug: testItem.slug,
          fieldData: { [ef.id]: { type: 'enum', value: caseName } }
        })
        console.log('SUCCESS with typed entry + caseName:', caseName)
      } catch (e) {
        console.log('FAIL typed entry + caseName:', e.message)
      }
    }
  }
} finally {
  await framer.disconnect()
}
