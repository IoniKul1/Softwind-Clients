'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { FramerField, FramerItem } from '@/lib/types'

function getImageUrl(item: FramerItem, fields: FramerField[]): string | null {
  for (const field of fields) {
    if (field.type !== 'image' && field.type !== 'array') continue
    const val = item.fieldData[field.id]
    if (!val || !val.value) continue
    // image type: { url: string }
    if (field.type === 'image' && typeof val.value === 'object' && !Array.isArray(val.value)) {
      const url = (val.value as any).url
      if (typeof url === 'string' && url) return url
    }
    // array type: [{ url: string }, ...]
    if (field.type === 'array' && Array.isArray(val.value) && val.value.length > 0) {
      const first = (val.value as any[])[0]
      if (first && typeof first.url === 'string' && first.url) return first.url
    }
  }
  return null
}

function getTitle(item: FramerItem, titleFieldId: string | null): string {
  if (titleFieldId) {
    const val = item.fieldData[titleFieldId]
    if (val && typeof val.value === 'string' && val.value) return val.value
  }
  return item.slug
}

export default function ItemsView({
  collectionId,
  clientId,
  items,
  fields,
}: {
  collectionId: string
  clientId?: string
  items: FramerItem[]
  fields: FramerField[]
}) {
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const base = clientId
    ? `/admin/clients/${clientId}/collections/${collectionId}`
    : `/collections/${collectionId}`
  const backHref = clientId ? `/admin/clients/${clientId}/collections` : '/collections'

  const titleFieldId = fields.find(f => f.type === 'string' && (f.name.toLowerCase().includes('title') || f.name.toLowerCase().includes('nombre') || f.name.toLowerCase().includes('name')))?.id ?? null

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Link href={backHref} className="text-xs text-neutral-500 hover:text-white transition">
          ← Volver
        </Link>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-neutral-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`px-2.5 py-1.5 transition ${view === 'grid' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Vista en cuadrícula"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="0" y="0" width="6" height="6" rx="1" fill="currentColor"/>
                <rect x="8" y="0" width="6" height="6" rx="1" fill="currentColor"/>
                <rect x="0" y="8" width="6" height="6" rx="1" fill="currentColor"/>
                <rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor"/>
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-2.5 py-1.5 transition ${view === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Vista en lista"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="0" y="0" width="14" height="2.5" rx="1" fill="currentColor"/>
                <rect x="0" y="5.5" width="14" height="2.5" rx="1" fill="currentColor"/>
                <rect x="0" y="11" width="14" height="2.5" rx="1" fill="currentColor"/>
              </svg>
            </button>
          </div>

          <Link
            href={`${base}/new`}
            className="text-xs border border-neutral-700 rounded-full px-4 py-2 hover:border-neutral-400 transition"
          >
            + Nuevo item
          </Link>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-neutral-500 text-sm">No hay items en esta colección.</p>
      )}

      {/* Grid view */}
      {view === 'grid' && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => {
            const imgUrl = getImageUrl(item, fields)
            const title = getTitle(item, titleFieldId)
            return (
              <Link
                key={item.id}
                href={`${base}/${item.id}`}
                className="group border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-600 transition bg-neutral-950"
              >
                {/* Image */}
                <div className="aspect-video bg-neutral-900 overflow-hidden">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-neutral-700">
                        <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="7" cy="7.5" r="1.5" fill="currentColor"/>
                        <path d="M2 13l4-4 3 3 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate leading-tight">{title}</span>
                    {item.draft && (
                      <span className="shrink-0 text-[10px] text-yellow-500 border border-yellow-700/50 rounded px-1 py-0.5 leading-none">
                        borrador
                      </span>
                    )}
                  </div>
                  {title !== item.slug && (
                    <p className="text-[11px] text-neutral-600 truncate mt-0.5">{item.slug}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const imgUrl = getImageUrl(item, fields)
            const title = getTitle(item, titleFieldId)
            return (
              <Link
                key={item.id}
                href={`${base}/${item.id}`}
                className="flex items-center gap-3 border border-neutral-800 rounded-xl px-4 py-3 hover:border-neutral-600 transition"
              >
                {imgUrl && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-900">
                    <img src={imgUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm truncate block">{title}</span>
                  {title !== item.slug && (
                    <span className="text-[11px] text-neutral-600 truncate block">{item.slug}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.draft && (
                    <span className="text-xs text-yellow-500 border border-yellow-700/50 rounded px-1.5 py-0.5">borrador</span>
                  )}
                  <span className="text-neutral-500 text-xs">Editar →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
