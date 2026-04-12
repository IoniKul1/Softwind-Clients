'use client'
import { useState, useEffect, useRef } from 'react'
import OnboardingFileUpload from './OnboardingFileUpload'
import type {
  OnboardingData, OnboardingBrand, OnboardingTypography,
  OnboardingColor, OnboardingReference, OnboardingPreviousSite,
  OnboardingContent, OnboardingBusiness,
} from '@/lib/types'

interface Props {
  sectionKey: keyof OnboardingData
  label: string
  initialData: OnboardingData
  userId: string
}

export default function OnboardingSection({ sectionKey, label, initialData, userId }: Props) {
  const [data, setData] = useState<OnboardingData>(initialData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  const uploadPrefix = `onboarding/${userId}/${sectionKey}`

  async function save(sectionData: unknown) {
    setSaving(true)
    setSaved(false)
    setError(null)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: sectionKey, data: sectionData }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setData(prev => ({ ...prev, [sectionKey]: sectionData }))
      setSaved(true)
      savedTimer.current = setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-white mb-6">{label}</h1>
      {sectionKey === 'brand' && (
        <BrandForm
          value={(data.brand ?? {}) as OnboardingBrand}
          uploadPrefix={uploadPrefix}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'typography' && (
        <TypographyForm
          value={(data.typography ?? {}) as OnboardingTypography}
          uploadPrefix={uploadPrefix}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'colors' && (
        <ColorsForm
          value={data.colors ?? []}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'references' && (
        <ReferencesForm
          value={data.references ?? []}
          uploadPrefix={uploadPrefix}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'previous_site' && (
        <PreviousSiteForm
          value={(data.previous_site ?? {}) as OnboardingPreviousSite}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'content' && (
        <ContentForm
          value={(data.content ?? {}) as OnboardingContent}
          uploadPrefix={uploadPrefix}
          onSave={save}
          saving={saving}
        />
      )}
      {sectionKey === 'business' && (
        <BusinessForm
          value={(data.business ?? {}) as OnboardingBusiness}
          onSave={save}
          saving={saving}
        />
      )}
      {saved && <p className="text-sm text-green-400 mt-4">✓ Guardado</p>}
      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
    </div>
  )
}

// ─── Brand ───────────────────────────────────────────────────────────────────

function BrandForm({ value, uploadPrefix, onSave, saving }: {
  value: OnboardingBrand; uploadPrefix: string; onSave: (d: unknown) => void; saving: boolean
}) {
  const [form, setForm] = useState(value)
  return (
    <div className="flex flex-col gap-5">
      <OnboardingFileUpload
        label="Logo principal (PNG preferido)"
        currentUrl={form.logo_url}
        accept="image/*"
        uploadKeyPrefix={`${uploadPrefix}/logo`}
        onUploaded={url => setForm(f => ({ ...f, logo_url: url }))}
      />
      <OnboardingFileUpload
        label="Isologo (PNG/SVG)"
        currentUrl={form.isologo_url}
        accept="image/*"
        uploadKeyPrefix={`${uploadPrefix}/isologo`}
        onUploaded={url => setForm(f => ({ ...f, isologo_url: url }))}
      />
      <OnboardingFileUpload
        label="Favicon (PNG/ICO)"
        currentUrl={form.favicon_url}
        accept="image/*,.ico"
        uploadKeyPrefix={`${uploadPrefix}/favicon`}
        onUploaded={url => setForm(f => ({ ...f, favicon_url: url }))}
      />
      <OnboardingFileUpload
        label="Brand Guide (PDF, opcional)"
        currentUrl={form.brand_guide_url}
        accept=".pdf"
        uploadKeyPrefix={`${uploadPrefix}/brand-guide`}
        onUploaded={url => setForm(f => ({ ...f, brand_guide_url: url }))}
      />
      <SaveButton onClick={() => onSave(form)} saving={saving} />
    </div>
  )
}

// ─── Typography ──────────────────────────────────────────────────────────────
// Field names from lib/types.ts: display_google_url and body_google_url

function TypographyForm({ value, uploadPrefix, onSave, saving }: {
  value: OnboardingTypography; uploadPrefix: string; onSave: (d: unknown) => void; saving: boolean
}) {
  const [form, setForm] = useState(value)
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="border border-neutral-800 rounded-lg p-4 flex flex-col gap-4">
        <legend className="text-xs text-neutral-400 px-2">Tipografía de Títulos (Display)</legend>
        <TextInput label="Nombre de la fuente" value={form.display_name ?? ''} onChange={v => setForm(f => ({ ...f, display_name: v }))} placeholder="ej. Playfair Display" />
        <TextInput label="URL Google Fonts (opcional)" value={form.display_google_url ?? ''} onChange={v => setForm(f => ({ ...f, display_google_url: v }))} placeholder="https://fonts.google.com/..." />
        <OnboardingFileUpload
          label="Archivo de fuente (TTF/OTF/WOFF, opcional)"
          currentUrl={form.display_file_url}
          accept=".ttf,.otf,.woff,.woff2"
          uploadKeyPrefix={`${uploadPrefix}/display-font`}
          onUploaded={url => setForm(f => ({ ...f, display_file_url: url }))}
        />
      </fieldset>
      <fieldset className="border border-neutral-800 rounded-lg p-4 flex flex-col gap-4">
        <legend className="text-xs text-neutral-400 px-2">Tipografía de Cuerpo (Body)</legend>
        <TextInput label="Nombre de la fuente" value={form.body_name ?? ''} onChange={v => setForm(f => ({ ...f, body_name: v }))} placeholder="ej. Inter" />
        <TextInput label="URL Google Fonts (opcional)" value={form.body_google_url ?? ''} onChange={v => setForm(f => ({ ...f, body_google_url: v }))} placeholder="https://fonts.google.com/..." />
        <OnboardingFileUpload
          label="Archivo de fuente (TTF/OTF/WOFF, opcional)"
          currentUrl={form.body_file_url}
          accept=".ttf,.otf,.woff,.woff2"
          uploadKeyPrefix={`${uploadPrefix}/body-font`}
          onUploaded={url => setForm(f => ({ ...f, body_file_url: url }))}
        />
      </fieldset>
      <fieldset className="border border-neutral-800 rounded-lg p-4">
        <legend className="text-xs text-neutral-400 px-2">Tipografía de Acento / UI (opcional)</legend>
        <TextInput label="Nombre de la fuente" value={form.accent_name ?? ''} onChange={v => setForm(f => ({ ...f, accent_name: v }))} placeholder="ej. DM Mono" />
      </fieldset>
      <SaveButton onClick={() => onSave(form)} saving={saving} />
    </div>
  )
}

// ─── Colors ──────────────────────────────────────────────────────────────────

type ColorEntry = OnboardingColor & { _id: string }

function ColorsForm({ value, onSave, saving }: {
  value: OnboardingColor[]; onSave: (d: unknown) => void; saving: boolean
}) {
  const [colors, setColors] = useState<ColorEntry[]>(() => {
    const seed = value.length > 0 ? value : [{ name: 'Primario', hex: '#6366f1' }]
    return seed.map(c => ({ ...c, _id: crypto.randomUUID() }))
  })

  function updateColor(id: string, field: keyof OnboardingColor, val: string) {
    setColors(cs => cs.map(c => c._id === id ? { ...c, [field]: val } : c))
  }

  function addColor() {
    setColors(cs => [...cs, { name: '', hex: '#000000', _id: crypto.randomUUID() }])
  }

  function removeColor(id: string) {
    setColors(cs => cs.filter(c => c._id !== id))
  }

  // Strip internal _id before saving
  function handleSave() {
    onSave(colors.map(({ _id: _, ...c }) => c))
  }

  return (
    <div className="flex flex-col gap-4">
      {colors.map(color => (
        <div key={color._id} className="flex items-center gap-3 p-3 border border-neutral-800 rounded-lg">
          <input
            type="color"
            value={color.hex}
            onChange={e => updateColor(color._id, 'hex', e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
          />
          <input
            type="text"
            value={color.hex}
            onChange={e => updateColor(color._id, 'hex', e.target.value)}
            placeholder="#000000"
            className="w-24 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded border border-neutral-700 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <input
            type="text"
            value={color.name}
            onChange={e => updateColor(color._id, 'name', e.target.value)}
            placeholder="ej. Primario"
            className="flex-1 bg-neutral-800 text-white text-sm px-3 py-1.5 rounded border border-neutral-700 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => removeColor(color._id)}
            className="text-neutral-600 hover:text-red-400 transition text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addColor}
        className="text-sm text-indigo-400 hover:text-indigo-300 transition text-left"
      >
        + Agregar color
      </button>
      <SaveButton onClick={handleSave} saving={saving} />
    </div>
  )
}

// ─── References ──────────────────────────────────────────────────────────────

type RefEntry = OnboardingReference & { _id: string }

function ReferencesForm({ value, uploadPrefix, onSave, saving }: {
  value: OnboardingReference[]; uploadPrefix: string; onSave: (d: unknown) => void; saving: boolean
}) {
  const [refs, setRefs] = useState<RefEntry[]>(() => {
    const seed = value.length > 0 ? value : [{}]
    return seed.map(r => ({ ...r, _id: crypto.randomUUID() }))
  })

  function updateRef(id: string, field: keyof OnboardingReference, val: string) {
    setRefs(rs => rs.map(r => r._id === id ? { ...r, [field]: val } : r))
  }

  function addRef() {
    setRefs(rs => [...rs, { _id: crypto.randomUUID() }])
  }

  function removeRef(id: string) {
    setRefs(rs => rs.filter(r => r._id !== id))
  }

  // Strip internal _id before saving
  function handleSave() {
    onSave(refs.map(({ _id: _, ...r }) => r))
  }

  return (
    <div className="flex flex-col gap-4">
      {refs.map((ref, i) => (
        <div key={ref._id} className="p-4 border border-neutral-800 rounded-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Referencia {i + 1}</span>
            <button onClick={() => removeRef(ref._id)} className="text-neutral-600 hover:text-red-400 transition text-sm">
              Eliminar
            </button>
          </div>
          <TextInput
            label="URL del sitio (opcional)"
            value={ref.url ?? ''}
            onChange={v => updateRef(ref._id, 'url', v)}
            placeholder="https://ejemplo.com"
          />
          <OnboardingFileUpload
            label="Imagen / captura (opcional)"
            currentUrl={ref.image_url}
            accept="image/*"
            uploadKeyPrefix={`${uploadPrefix}/ref-${ref._id}`}
            onUploaded={url => setRefs(rs => rs.map(r => r._id === ref._id ? { ...r, image_url: url } : r))}
          />
          <TextInput
            label="Nota (opcional)"
            value={ref.note ?? ''}
            onChange={v => updateRef(ref._id, 'note', v)}
            placeholder="ej. Me gusta la navegación"
          />
        </div>
      ))}
      <button onClick={addRef} className="text-sm text-indigo-400 hover:text-indigo-300 transition text-left">
        + Agregar referencia
      </button>
      <SaveButton onClick={handleSave} saving={saving} />
    </div>
  )
}

// ─── Previous Site ───────────────────────────────────────────────────────────

function PreviousSiteForm({ value, onSave, saving }: {
  value: OnboardingPreviousSite; onSave: (d: unknown) => void; saving: boolean
}) {
  const [form, setForm] = useState(value)

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.na ?? false}
          onChange={e => setForm(f => ({ ...f, na: e.target.checked }))}
          className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-indigo-500 focus:ring-indigo-500"
        />
        <span className="text-sm text-neutral-400">No tenemos sitio web anterior</span>
      </label>
      {!form.na && (
        <>
          <TextInput
            label="URL del sitio actual"
            value={form.url ?? ''}
            onChange={v => setForm(f => ({ ...f, url: v }))}
            placeholder="https://mi-sitio-viejo.com"
          />
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">¿Qué te gusta del sitio actual?</label>
            <textarea
              value={form.likes ?? ''}
              onChange={e => setForm(f => ({ ...f, likes: e.target.value }))}
              rows={3}
              className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="ej. Me gusta la paleta de colores..."
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">¿Qué no te gusta o querés cambiar?</label>
            <textarea
              value={form.dislikes ?? ''}
              onChange={e => setForm(f => ({ ...f, dislikes: e.target.value }))}
              rows={3}
              className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="ej. La navegación es confusa..."
            />
          </div>
        </>
      )}
      <SaveButton onClick={() => onSave(form)} saving={saving} />
    </div>
  )
}

// ─── Content ─────────────────────────────────────────────────────────────────

function ContentForm({ value, uploadPrefix, onSave, saving }: {
  value: OnboardingContent; uploadPrefix: string; onSave: (d: unknown) => void; saving: boolean
}) {
  const [form, setForm] = useState(value)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    setUploadError(null)
    try {
      const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
      if (!r2Url) throw new Error('NEXT_PUBLIC_R2_PUBLIC_URL no está configurado')
      const uploaded: Array<{ url: string; name: string }> = []
      for (const file of files) {
        const contentType = file.type || 'application/octet-stream'
        const key = `${uploadPrefix}/content/${Date.now()}-${file.name}`
        const res = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`)
        if (!res.ok) throw new Error(`Error al obtener URL de subida para ${file.name}`)
        const { url } = await res.json()
        const uploadRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })
        if (!uploadRes.ok) throw new Error(`Error al subir ${file.name}`)
        uploaded.push({ url: `${r2Url}/${key}`, name: file.name })
      }
      setForm(f => ({ ...f, files: [...(f.files ?? []), ...uploaded] }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Archivos de texto / contenido (DOCX, PDF, TXT)</label>
        <input
          type="file"
          accept=".docx,.pdf,.txt,.doc"
          multiple
          disabled={uploading}
          onChange={handleFiles}
          className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-neutral-800 file:text-neutral-200 file:text-xs hover:file:bg-neutral-700 transition disabled:opacity-50"
        />
        {uploading && <p className="text-xs text-neutral-500 mt-1">Subiendo archivos...</p>}
        {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
        {(form.files ?? []).length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {(form.files ?? []).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-neutral-400">
                <span aria-hidden="true">📄</span>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition truncate">{f.name}</a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Notas adicionales</label>
        <textarea
          value={form.notes ?? ''}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={4}
          className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
          placeholder="ej. El texto del About está en el documento, las fotos las mandamos por drive..."
        />
      </div>
      <SaveButton onClick={() => onSave(form)} saving={saving || uploading} />
    </div>
  )
}

// ─── Business ────────────────────────────────────────────────────────────────

function BusinessForm({ value, onSave, saving }: {
  value: OnboardingBusiness; onSave: (d: unknown) => void; saving: boolean
}) {
  const [form, setForm] = useState(value)
  const [competitorInput, setCompetitorInput] = useState('')

  function addCompetitor() {
    if (!competitorInput.trim()) return
    setForm(f => ({ ...f, competitors: [...(f.competitors ?? []), competitorInput.trim()] }))
    setCompetitorInput('')
  }

  function removeCompetitor(i: number) {
    setForm(f => ({ ...f, competitors: (f.competitors ?? []).filter((_, j) => j !== i) }))
  }

  return (
    <div className="flex flex-col gap-5">
      <TextInput label="Rubro / industria" value={form.industry ?? ''} onChange={v => setForm(f => ({ ...f, industry: v }))} placeholder="ej. Arquitectura, Moda, Tecnología..." />
      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Público objetivo</label>
        <textarea
          value={form.audience ?? ''}
          onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
          rows={3}
          className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
          placeholder="ej. Profesionales de 30-45 años en LATAM..."
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Competidores (URLs)</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={competitorInput}
            onChange={e => setCompetitorInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCompetitor())}
            placeholder="https://competidor.com"
            className="flex-1 bg-neutral-800 text-white text-sm px-3 py-1.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
          />
          <button onClick={addCompetitor} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg transition">
            +
          </button>
        </div>
        {(form.competitors ?? []).map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
            <span className="truncate flex-1">{c}</span>
            <button onClick={() => removeCompetitor(i)} className="text-neutral-600 hover:text-red-400 transition">×</button>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs text-neutral-400 mb-2">Redes sociales</label>
        <div className="flex flex-col gap-2">
          {['instagram', 'linkedin', 'facebook', 'twitter'].map(net => (
            <div key={net} className="flex items-center gap-2">
              <span className="text-xs text-neutral-600 w-20 capitalize">{net}</span>
              <input
                type="text"
                value={(form.social ?? {})[net] ?? ''}
                onChange={e => setForm(f => ({ ...f, social: { ...(f.social ?? {}), [net]: e.target.value } }))}
                placeholder={`@usuario o URL`}
                className="flex-1 bg-neutral-800 text-white text-sm px-3 py-1.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
      </div>
      <TextInput
        label="Tono de voz"
        value={form.tone ?? ''}
        onChange={v => setForm(f => ({ ...f, tone: v }))}
        placeholder="ej. Formal y profesional, Cercano y amigable, Técnico..."
      />
      <SaveButton onClick={() => onSave(form)} saving={saving} />
    </div>
  )
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function TextInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
      />
    </div>
  )
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="self-start px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
    >
      {saving ? 'Guardando...' : 'Guardar'}
    </button>
  )
}
