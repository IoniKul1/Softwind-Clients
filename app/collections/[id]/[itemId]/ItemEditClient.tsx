'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FramerField, FramerItem, FramerFieldValue } from '@/lib/types'
import { FieldRenderer } from '@/components/FieldRenderer'

interface Props {
  collectionId: string
  item: FramerItem
  fields: FramerField[]
  saveUrl?: string
  deleteUrl?: string
  backUrl?: string
  uploadPrefix?: string
  publishUrl?: string
}

export default function ItemEditClient({ collectionId, item, fields, saveUrl, deleteUrl, backUrl, uploadPrefix, publishUrl }: Props) {
  const router = useRouter()
  const [fieldData, setFieldData] = useState<Record<string, FramerFieldValue>>(item.fieldData)
  const [draft, setDraft] = useState(item.draft ?? false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set())
  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'done' | 'error'>('idle')

  function handleChange(fieldId: string, value: FramerFieldValue) {
    setFieldData((prev) => ({ ...prev, [fieldId]: value }))
  }

  function isEmpty(val: FramerFieldValue | undefined): boolean {
    if (!val || val.value === null || val.value === undefined) return true
    if (typeof val.value === 'string') return val.value.trim() === ''
    if (Array.isArray(val.value)) return val.value.length === 0
    return false
  }

  async function handleSave() {
    const missing = new Set(
      fields
        .filter(f => f.required && f.userEditable !== false && isEmpty(fieldData[f.id]))
        .map(f => f.id)
    )
    if (missing.size > 0) {
      setErrorFields(missing)
      setErrorMsg(`Completá los campos obligatorios antes de publicar.`)
      return
    }
    setErrorFields(new Set())
    setStatus('saving')
    setErrorMsg('')
    try {
      const res = await fetch(saveUrl ?? `/api/collections/${collectionId}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: item.slug, draft, fieldData }),
      })
      if (res.ok) {
        setStatus('done')
        setPublishStatus('idle')
        setTimeout(() => setStatus('idle'), 4000)
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? 'Error al guardar')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Error de red. Intentá de nuevo.')
      setStatus('error')
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setPublishStatus('idle')
    try {
      const url = publishUrl ?? `/api/collections/${collectionId}/publish`
      const res = await fetch(url, { method: 'POST' })
      if (res.ok) {
        setPublishStatus('done')
        setTimeout(() => setPublishStatus('idle'), 4000)
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? 'Error al publicar')
        setPublishStatus('error')
      }
    } catch {
      setErrorMsg('Error de red al publicar.')
      setPublishStatus('error')
    } finally {
      setPublishing(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este item? Esta acción no se puede deshacer.')) return
    setStatus('saving')
    const url = deleteUrl ?? `/api/collections/${collectionId}/items/${item.id}`
    const res = await fetch(`${url}?slug=${encodeURIComponent(item.slug)}`, { method: 'DELETE' })
    if (res.ok) {
      router.push(backUrl ?? `/collections/${collectionId}`)
    } else {
      const data = await res.json()
      setErrorMsg(data.error ?? 'Error al eliminar')
      setStatus('error')
    }
  }

  const editableFields = fields.filter((f) => f.userEditable !== false)

  return (
    <div className="flex flex-col gap-6">
      {editableFields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={fieldData[field.id]}
          onChange={handleChange}
          uploadPrefix={uploadPrefix}
          hasError={errorFields.has(field.id)}
        />
      ))}

      <div className="pt-4 flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setDraft((d) => !d)}
            className={`w-10 h-6 rounded-full transition-colors ${draft ? 'bg-yellow-500' : 'bg-neutral-600'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${draft ? 'translate-x-1' : 'translate-x-5'}`} />
          </div>
          <span className="text-sm text-neutral-300">{draft ? 'Borrador' : 'Publicado'}</span>
        </label>

        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-3 bg-brand text-white font-medium rounded-full text-sm disabled:opacity-30 hover:bg-brand-hover transition"
        >
          {status === 'saving' ? 'Guardando...' : 'Guardar →'}
        </button>

        <button
          onClick={handlePublish}
          disabled={publishing || status === 'saving'}
          className="w-full py-3 border border-neutral-700 text-neutral-200 font-medium rounded-full text-sm disabled:opacity-30 hover:border-neutral-500 transition"
        >
          {publishing ? 'Publicando en Framer...' : 'Publicar en Framer →'}
        </button>

        <button
          onClick={handleDelete}
          disabled={status === 'saving' || publishing}
          className="w-full py-2 text-red-500 text-sm disabled:opacity-30 hover:text-red-400 transition"
        >
          Eliminar item
        </button>

        {status === 'done' && <p className="text-green-400 text-xs text-center">✓ Cambios guardados</p>}
        {status === 'error' && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
        {publishStatus === 'done' && <p className="text-green-400 text-xs text-center">✓ Publicado en Framer</p>}
        {publishStatus === 'error' && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
      </div>
    </div>
  )
}
