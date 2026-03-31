'use client'
import { useState, FormEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
  defaultName: string
  defaultEmail: string
  defaultProjectName: string
  defaultFramerProjectUrl: string
  defaultWebsiteUrl: string
  projectId: string | null
}

export default function EditClientForm({ id, defaultName, defaultEmail, defaultProjectName, defaultFramerProjectUrl, defaultWebsiteUrl, projectId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    projectName: defaultProjectName,
    framerProjectUrl: defaultFramerProjectUrl,
    websiteUrl: defaultWebsiteUrl,
    framerApiKey: '',
  })

  const [analyticsFile, setAnalyticsFile] = useState<File | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsSuccess, setAnalyticsSuccess] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, projectId }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al actualizar')
    } else {
      router.push('/admin')
    }
  }

  async function handleAnalyticsUpload() {
    if (!analyticsFile) return
    setAnalyticsLoading(true)
    setAnalyticsError('')
    setAnalyticsSuccess(false)

    const fd = new FormData()
    fd.append('image', analyticsFile)

    const res = await fetch(`/api/admin/clients/${id}/analytics`, {
      method: 'POST',
      body: fd,
    })
    setAnalyticsLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setAnalyticsError(data.error ?? 'Error al procesar imagen')
    } else {
      setAnalyticsSuccess(true)
      setAnalyticsFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const inputClass = "bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition w-full"
  const labelClass = "text-xs text-neutral-400 mb-1 block"

  return (
    <div className="max-w-md flex flex-col gap-10">
      <div>
        <h2 className="text-xl font-semibold mb-6">Editar cliente</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Nombre</label>
            <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <hr className="border-neutral-800" />
          <div>
            <label className={labelClass}>Nombre del proyecto</label>
            <input className={inputClass} value={form.projectName} onChange={e => set('projectName', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Framer Project URL</label>
            <input className={inputClass} value={form.framerProjectUrl} onChange={e => set('framerProjectUrl', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>URL del sitio web <span className="text-neutral-600">(dominio publicado)</span></label>
            <input className={inputClass} value={form.websiteUrl} onChange={e => set('websiteUrl', e.target.value)} placeholder="https://ejemplo.com" />
          </div>
          <div>
            <label className={labelClass}>
              Framer API Key {projectId ? <span className="text-neutral-600">(dejar vacío para no cambiar)</span> : <span className="text-red-400">*requerida</span>}
            </label>
            <input type="password" className={inputClass} value={form.framerApiKey} onChange={e => set('framerApiKey', e.target.value)} placeholder="fr_..." required={!projectId} />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="py-3 bg-brand text-white font-medium rounded-full text-sm disabled:opacity-30 hover:bg-brand-hover transition mt-2">
            {loading ? 'Guardando...' : 'Guardar cambios →'}
          </button>
        </form>
      </div>

      {projectId && (
        <div>
          <h3 className="text-sm font-medium mb-1">Analytics</h3>
          <p className="text-xs text-neutral-500 mb-4">Subí un screenshot de Framer Analytics para actualizar las métricas del cliente.</p>
          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={e => { setAnalyticsFile(e.target.files?.[0] ?? null); setAnalyticsSuccess(false) }}
              className="text-xs text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-neutral-800 file:text-neutral-300 hover:file:bg-neutral-700 file:cursor-pointer"
            />
            {analyticsFile && (
              <button
                onClick={handleAnalyticsUpload}
                disabled={analyticsLoading}
                className="py-2.5 px-5 bg-neutral-800 hover:bg-neutral-700 rounded-full text-sm disabled:opacity-40 transition self-start"
              >
                {analyticsLoading ? 'Procesando...' : 'Extraer métricas →'}
              </button>
            )}
            {analyticsSuccess && <p className="text-green-400 text-xs">Métricas actualizadas correctamente.</p>}
            {analyticsError && <p className="text-red-400 text-xs">{analyticsError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
