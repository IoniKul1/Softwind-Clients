'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { FramerField, FramerFieldValue } from '@/lib/types'
import { FieldRenderer } from '@/components/FieldRenderer'
import { compressImage } from '@/lib/compress-image'

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

  // NOA recommendation
  const [recommending, setRecommending] = useState(false)
  const [recommendError, setRecommendError] = useState('')
  const [loadingStep, setLoadingStep] = useState(0)

  const recommendingMessages = ['Leyendo tu contenido...', 'NOA está analizando...']

  // NOA cover image
  const imageField = editableFields.find((f) => f.type === 'image')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imagePrompt, setImagePrompt] = useState('')
  const [imagePromptEdit, setImagePromptEdit] = useState('')
  const [showImagePromptInput, setShowImagePromptInput] = useState(false)
  const [imageGenerating, setImageGenerating] = useState(false)
  const [imageApproving, setImageApproving] = useState(false)
  const [imageError, setImageError] = useState('')
  const ownImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!recommending) { setLoadingStep(0); return }
    setLoadingStep(0)
    const interval = setInterval(() => setLoadingStep(s => Math.min(s + 1, recommendingMessages.length - 1)), 3000)
    return () => clearInterval(interval)
  }, [recommending])

  function handleChange(fieldId: string, value: FramerFieldValue) {
    setFieldData((prev) => ({ ...prev, [fieldId]: value }))
  }

  async function handleRecommend() {
    setRecommending(true)
    setRecommendError('')
    try {
      const res = await fetch(`/api/collections/${collectionId}/recommend`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        setRecommendError(d.error ?? 'Error al obtener recomendación')
        return
      }
      const { title, premise } = await res.json()
      // Go straight to generation with the recommended topic
      await handleGenerateWithTopic(`${title}. ${premise}`)
    } catch {
      setRecommendError('Tiempo de espera agotado. Intentá de nuevo.')
    } finally {
      setRecommending(false)
    }
  }

  async function handleGenerate() {
    await handleGenerateWithTopic(topic)
  }

  async function handleGenerateWithTopic(t: string) {
    if (!t.trim()) return
    setGenerating(true)
    setAiError('')
    try {
      const res = await fetch(`/api/collections/${collectionId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t, fields: editableFields.map(f => ({ id: f.id, name: f.name, type: f.type })) }),
      })
      if (!res.ok) {
        const d = await res.json()
        setAiError(d.error ?? 'NOA no pudo generar el contenido. Intentá de nuevo.')
        return
      }
      const { slug: generatedSlug, fieldData: generated } = await res.json()
      if (generatedSlug) setSlug(generatedSlug)
      setFieldData(prev => ({ ...prev, ...generated }))
      setFieldDataKey(k => k + 1)
      setShowAI(false)
      setTopic('')
      if (imageField) {
        const coverPrompt = `Cover image for a blog post about: ${t}. Style: editorial photo, soft natural lighting, clean minimal composition, wide shot, no text, no watermarks, no logos, no letters.`
        setImagePrompt(coverPrompt)
        setImagePromptEdit(coverPrompt)
        void generateCoverImage(coverPrompt)
      }
    } catch {
      setAiError('Tiempo de espera agotado. Intentá de nuevo.')
    } finally {
      setGenerating(false)
    }
  }

  async function generateCoverImage(prompt: string) {
    setImageGenerating(true)
    setImageError('')
    try {
      const res = await fetch(`/api/collections/${collectionId}/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setImageError(d.error ?? 'No pudimos generar la imagen. Probá de nuevo.')
        return
      }
      const { dataUrl } = await res.json()
      setImagePreview(dataUrl)
      setShowImagePromptInput(false)
    } catch {
      setImageError('Tiempo de espera agotado. Probá de nuevo.')
    } finally {
      setImageGenerating(false)
    }
  }

  async function handleApproveImage() {
    if (!imagePreview || !imageField) return
    setImageApproving(true)
    setImageError('')
    try {
      const blob = await (await fetch(imagePreview)).blob()
      const ext = blob.type === 'image/webp' ? 'webp' : 'png'
      const base = uploadBasePrefix && slug.trim() ? `${uploadBasePrefix}/${slug.trim()}` : `uploads/${imageField.id}`
      const key = `${base}/${imageField.id}/${Date.now()}.${ext}`

      const urlRes = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(blob.type)}`)
      const { url: presignedUrl } = await urlRes.json()
      await fetch(presignedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } })

      const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
      const publicUrl = `${publicBase}/${key}`
      setFieldData(prev => ({ ...prev, [imageField.id]: { type: 'image', value: { url: publicUrl } } }))
      setFieldDataKey(k => k + 1)
      setImagePreview(null)
    } catch {
      setImageError('No pudimos subir la imagen. Probá de nuevo.')
    } finally {
      setImageApproving(false)
    }
  }

  async function handleUploadOwnImage(file: File) {
    if (!imageField) return
    setImageApproving(true)
    setImageError('')
    try {
      const compressed = await compressImage(file)
      const ext = compressed.type === 'image/webp' ? 'webp' : file.name.split('.').pop()
      const base = uploadBasePrefix && slug.trim() ? `${uploadBasePrefix}/${slug.trim()}` : `uploads/${imageField.id}`
      const key = `${base}/${imageField.id}/${Date.now()}.${ext}`

      const urlRes = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(compressed.type)}`)
      const { url: presignedUrl } = await urlRes.json()
      await fetch(presignedUrl, { method: 'PUT', body: compressed, headers: { 'Content-Type': compressed.type } })

      const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
      const publicUrl = `${publicBase}/${key}`
      setFieldData(prev => ({ ...prev, [imageField.id]: { type: 'image', value: { url: publicUrl } } }))
      setFieldDataKey(k => k + 1)
      setImagePreview(null)
    } catch {
      setImageError('No pudimos subir la imagen. Probá de nuevo.')
    } finally {
      setImageApproving(false)
    }
  }

  async function handleCreate() {
    if (!slug.trim()) {
      setErrorMsg('El slug es requerido')
      setStatus('error')
      return
    }
    setStatus('saving')
    setErrorMsg('')
    try {
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug.trim(), fieldData }),
      })
      if (res.ok) {
        setStatus('done')
        setTimeout(() => router.push(backUrl), 1500)
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? 'Error al crear')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Error de red. Intentá de nuevo.')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* NOA recommending modal */}
      {recommending && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <div className="relative overflow-hidden" style={{ width: 160, height: 32 }}>
            <img src="/logo.png" alt="Softwind" width={160} height={32}
              style={{ opacity: 0.12, objectFit: 'contain', width: '100%', height: '100%' }} />
            <img src="/logo.png" alt="" width={160} height={32}
              style={{ objectFit: 'contain', width: '100%', height: '100%',
                position: 'absolute', inset: 0, animation: 'logo-reveal 1.8s ease-in-out infinite' }} />
          </div>
          <p key={loadingStep} className="text-neutral-400 text-xs tracking-wide" style={{ animation: 'fade-in 0.4s ease forwards' }}>
            {recommendingMessages[loadingStep]}
          </p>
          <style>{`
            @keyframes logo-reveal {
              0%   { clip-path: inset(0 100% 0 0); }
              60%  { clip-path: inset(0 0% 0 0); }
              80%  { clip-path: inset(0 0% 0 0); opacity: 1; }
              100% { clip-path: inset(0 0% 0 0); opacity: 0; }
            }
            @keyframes fade-in {
              from { opacity: 0; transform: translateY(4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* AI generating modal */}
      {generating && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <div className="relative overflow-hidden" style={{ width: 160, height: 32 }}>
            <img src="/logo.png" alt="Softwind" width={160} height={32}
              style={{ opacity: 0.12, objectFit: 'contain', width: '100%', height: '100%' }} />
            <img src="/logo.png" alt="" width={160} height={32}
              style={{ objectFit: 'contain', width: '100%', height: '100%',
                position: 'absolute', inset: 0, animation: 'logo-reveal 1.8s ease-in-out infinite' }} />
          </div>
          <p className="text-neutral-400 text-xs tracking-wide" style={{ animation: 'fade-in 0.6s ease forwards' }}>
            NOA está escribiendo tu blog...
          </p>
          <style>{`
            @keyframes logo-reveal {
              0%   { clip-path: inset(0 100% 0 0); }
              60%  { clip-path: inset(0 0% 0 0); }
              80%  { clip-path: inset(0 0% 0 0); opacity: 1; }
              100% { clip-path: inset(0 0% 0 0); opacity: 0; }
            }
            @keyframes fade-in {
              from { opacity: 0; transform: translateY(4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* AI Generator */}
      <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium">NOA</p>
            <p className="text-xs text-neutral-500 mt-0.5">La IA de Softwind que escribe tu contenido</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRecommend}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-brand/40 bg-brand/10 text-brand hover:bg-brand/20 transition"
            >
              <span className="w-4 h-4 rounded-full bg-brand flex items-center justify-center shrink-0">
                <span className="text-white text-[8px] font-bold">N</span>
              </span>
              Recomendación de NOA
            </button>
            <button
              type="button"
              onClick={() => setShowAI(s => !s)}
              className="text-xs px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500 transition"
            >
              {showAI ? 'Cancelar' : 'Generar →'}
            </button>
          </div>
        </div>
        {recommendError && <p className="text-red-400 text-xs mb-2">{recommendError}</p>}

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
              {generating ? 'NOA está escribiendo...' : 'Escribir con NOA'}
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

      {/* NOA cover image — shown only while a preview is pending approval */}
      {imageField && (imageGenerating || imagePreview || imageError) && (
        <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-brand flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold">N</span>
            </span>
            <p className="text-sm font-medium">Imagen sugerida</p>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-neutral-950 aspect-square max-w-[240px]">
            {imageGenerating ? (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-xs">
                Generando imagen...
              </div>
            ) : imagePreview ? (
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
            ) : null}
          </div>

          {imageError && <p className="text-red-400 text-xs">{imageError}</p>}

          {showImagePromptInput && (
            <div className="flex flex-col gap-2">
              <textarea
                value={imagePromptEdit}
                onChange={(e) => setImagePromptEdit(e.target.value)}
                rows={3}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-neutral-500 transition"
                placeholder="Describí cómo querés la imagen..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setImagePrompt(imagePromptEdit); void generateCoverImage(imagePromptEdit) }}
                  disabled={imageGenerating || !imagePromptEdit.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-brand text-white disabled:opacity-30 hover:bg-brand-hover transition"
                >
                  Generar nueva
                </button>
                <button
                  type="button"
                  onClick={() => { setShowImagePromptInput(false); setImagePromptEdit(imagePrompt) }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!showImagePromptInput && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApproveImage}
                disabled={!imagePreview || imageGenerating || imageApproving}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand text-white disabled:opacity-30 hover:bg-brand-hover transition"
              >
                {imageApproving ? 'Guardando...' : 'Aprobar esta imagen'}
              </button>
              <button
                type="button"
                onClick={() => setShowImagePromptInput(true)}
                disabled={imageGenerating || imageApproving}
                className="text-xs px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 disabled:opacity-30 hover:border-neutral-500 transition"
              >
                Regenerar con otro prompt
              </button>
              <button
                type="button"
                onClick={() => ownImageInputRef.current?.click()}
                disabled={imageApproving}
                className="text-xs px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 disabled:opacity-30 hover:border-neutral-500 transition"
              >
                Subir la mía
              </button>
              <button
                type="button"
                onClick={() => { setImagePreview(null); setImageError('') }}
                disabled={imageApproving}
                className="text-xs px-3 py-1.5 text-neutral-500 hover:text-neutral-300 transition disabled:opacity-30"
              >
                Descartar
              </button>
              <input
                ref={ownImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleUploadOwnImage(f)
                  e.target.value = ''
                }}
              />
            </div>
          )}
        </div>
      )}

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
