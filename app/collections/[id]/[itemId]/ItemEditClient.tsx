'use client'
import { useState } from 'react'
import type { FramerField, FramerItem, FramerFieldValue } from '@/lib/types'
import { FieldRenderer } from '@/components/FieldRenderer'

interface Props {
  collectionId: string
  item: FramerItem
  fields: FramerField[]
  saveUrl?: string
  backUrl?: string
}

export default function ItemEditClient({ collectionId, item, fields, saveUrl, backUrl }: Props) {
  const [fieldData, setFieldData] = useState<Record<string, FramerFieldValue>>(item.fieldData)
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
      body: JSON.stringify({ slug: item.slug, fieldData }),
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

      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-3 bg-white text-black font-medium rounded-full text-sm disabled:opacity-30 hover:bg-neutral-200 transition"
        >
          {status === 'saving' ? 'Publicando...' : 'Guardar y publicar →'}
        </button>
        {status === 'done' && <p className="text-green-400 text-xs text-center mt-2">✓ Cambios publicados</p>}
        {status === 'error' && <p className="text-red-400 text-xs text-center mt-2">{errorMsg}</p>}
      </div>
    </div>
  )
}
