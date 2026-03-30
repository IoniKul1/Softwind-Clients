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
}

export default function ItemEditClient({ collectionId, item, fields, saveUrl, deleteUrl, backUrl }: Props) {
  const router = useRouter()
  const [fieldData, setFieldData] = useState<Record<string, FramerFieldValue>>(item.fieldData)
  const [draft, setDraft] = useState(item.draft ?? false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(fieldId: string, value: FramerFieldValue) {
    setFieldData((prev) => ({ ...prev, [fieldId]: value }))
  }

  async function handleSave() {
    setStatus('saving')
    setErrorMsg('')
    const res = await fetch(saveUrl ?? `/api/collections/${collectionId}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: item.slug, draft, fieldData }),
    })
    if (res.ok) {
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } else {
      const data = await res.json()
      setErrorMsg(data.error ?? 'Error al guardar')
      setStatus('error')
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este item? Esta acción no se puede deshacer.')) return
    setStatus('saving')
    const url = deleteUrl ?? `/api/collections/${collectionId}/items/${item.id}`
    const res = await fetch(url, { method: 'DELETE' })
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
          className="w-full py-3 bg-white text-black font-medium rounded-full text-sm disabled:opacity-30 hover:bg-neutral-200 transition"
        >
          {status === 'saving' ? 'Publicando...' : 'Guardar y publicar →'}
        </button>

        <button
          onClick={handleDelete}
          disabled={status === 'saving'}
          className="w-full py-2 text-red-500 text-sm disabled:opacity-30 hover:text-red-400 transition"
        >
          Eliminar item
        </button>

        {status === 'done' && <p className="text-green-400 text-xs text-center">✓ Cambios publicados</p>}
        {status === 'error' && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
      </div>
    </div>
  )
}
