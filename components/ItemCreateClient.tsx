'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FramerField, FramerFieldValue } from '@/lib/types'
import { FieldRenderer } from '@/components/FieldRenderer'

interface Props {
  collectionId: string
  fields: FramerField[]
  createUrl: string
  backUrl: string
  uploadBasePrefix?: string
}

function emptyFieldData(fields: FramerField[]): Record<string, FramerFieldValue> {
  const result: Record<string, FramerFieldValue> = {}
  for (const f of fields) {
    switch (f.type) {
      case 'string':
      case 'formattedText':
      case 'link':
      case 'color':
        result[f.id] = { type: f.type, value: '' }
        break
      case 'number':
        result[f.id] = { type: f.type, value: null }
        break
      case 'boolean':
        result[f.id] = { type: f.type, value: false }
        break
      case 'date':
        result[f.id] = { type: f.type, value: null }
        break
      case 'image':
      case 'file':
        result[f.id] = { type: f.type, value: null }
        break
      case 'array':
        result[f.id] = { type: f.type, value: [] }
        break
      case 'enum':
        result[f.id] = { type: f.type, value: f.cases?.[0]?.id ?? '' }
        break
    }
  }
  return result
}

export default function ItemCreateClient({ fields, createUrl, backUrl, uploadBasePrefix }: Props) {
  const router = useRouter()
  const editableFields = fields.filter((f) => f.userEditable !== false)
  const [slug, setSlug] = useState('')
  const [fieldData, setFieldData] = useState<Record<string, FramerFieldValue>>(emptyFieldData(editableFields))
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(fieldId: string, value: FramerFieldValue) {
    setFieldData((prev) => ({ ...prev, [fieldId]: value }))
  }

  async function handleCreate() {
    if (!slug.trim()) {
      setErrorMsg('El slug es requerido')
      setStatus('error')
      return
    }
    setStatus('saving')
    setErrorMsg('')
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug.trim(), fieldData }),
    })
    if (res.ok) {
      setStatus('done')
      setTimeout(() => router.push(backUrl), 1500)
    } else {
      const data = await res.json()
      setErrorMsg(data.error ?? 'Error al crear')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-400">Slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="mi-nuevo-item"
          className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
        />
      </div>

      {editableFields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={fieldData[field.id]}
          onChange={handleChange}
          uploadPrefix={uploadBasePrefix && slug.trim() ? `${uploadBasePrefix}/${slug.trim()}` : undefined}
        />
      ))}

      <div className="pt-4">
        <button
          onClick={handleCreate}
          disabled={status === 'saving'}
          className="w-full py-3 bg-brand text-white font-medium rounded-full text-sm disabled:opacity-30 hover:bg-brand-hover transition"
        >
          {status === 'saving' ? 'Creando...' : 'Crear y publicar →'}
        </button>
        {status === 'done' && <p className="text-green-400 text-xs text-center mt-2">✓ Item creado</p>}
        {status === 'error' && <p className="text-red-400 text-xs text-center mt-2">{errorMsg}</p>}
      </div>
    </div>
  )
}
