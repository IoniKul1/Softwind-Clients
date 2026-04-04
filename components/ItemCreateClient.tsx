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
        result[f.id] = { type: f.type, value: new Date().toISOString() }
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

export default function ItemCreateClient({ collectionId, fields, createUrl, backUrl, uploadBasePrefix }: Props) {
  const router = useRouter()
  const editableFields = fields.filter((f) => f.userEditable !== false)
  const [slug, setSlug] = useState('')
  const [fieldData, setFieldData] = useState<Record<string, FramerFieldValue>>(emptyFieldData(editableFields))
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // AI generation
  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [aiError, setAiError] = useState('')
  const [fieldDataKey, setFieldDataKey] = useState(0)

  function handleChange(fieldId: string, value: FramerFieldValue) {
    setFieldData((prev) => ({ ...prev, [fieldId]: value }))
  }

  async function handleGenerate() {
    if (!topic.trim()) return
    setGenerating(true)
    setAiError('')
    const res = await fetch(`/api/collections/${collectionId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    })
    setGenerating(false)
    if (!res.ok) {
      const d = await res.json()
      setAiError(d.error ?? 'Error al generar')
      return
    }
    const { slug: generatedSlug, fieldData: generated } = await res.json()
    if (generatedSlug) setSlug(generatedSlug)
    setFieldData(prev => ({ ...prev, ...generated }))
    setFieldDataKey(k => k + 1) // remount editors with new content
    setShowAI(false)
    setTopic('')
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
      {/* AI Generator */}
      <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium">Generar con IA</p>
            <p className="text-xs text-neutral-500 mt-0.5">Claude genera el contenido basándose en tus blogs existentes</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAI(s => !s)}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500 transition"
          >
            {showAI ? 'Cancelar' : 'Generar →'}
          </button>
        </div>

        {showAI && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="Tema del blog, ej: 'beneficios del diseño web profesional'"
              autoFocus
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500 transition placeholder:text-neutral-600"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="px-4 py-2 bg-brand text-white text-sm rounded-lg disabled:opacity-30 hover:bg-brand-hover transition shrink-0"
            >
              {generating ? 'Generando...' : 'Generar'}
            </button>
          </div>
        )}
        {aiError && <p className="text-red-400 text-xs mt-2">{aiError}</p>}
      </div>

      {/* Slug */}
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
          key={`${field.id}-${fieldDataKey}`}
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
