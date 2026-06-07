'use client'
import { useState, FormEvent } from 'react'
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
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    projectName: defaultProjectName,
    framerProjectUrl: defaultFramerProjectUrl,
    websiteUrl: defaultWebsiteUrl,
    framerApiKey: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const res = await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al eliminar')
      setDeleting(false)
      return
    }
    router.push('/admin')
    router.refresh()
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
      router.refresh()
    }
  }

  const inputClass = "bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition w-full"
  const labelClass = "text-xs text-neutral-400 mb-1 block"

  return (
    <div className="max-w-md">
      <h2 className="text-base font-semibold mb-6 text-neutral-300">Configuración del cliente</h2>
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

      <div className="mt-12 pt-6 border-t border-red-900/40">
        <h3 className="text-sm font-semibold text-red-400 mb-1">Zona peligrosa</h3>
        <p className="text-xs text-neutral-500 mb-4">
          Eliminar este cliente borra su cuenta, proyecto, onboarding, analytics y todos sus pedidos. Esta acción no se puede deshacer.
        </p>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => { setConfirmDelete(true); setError('') }}
            className="py-2.5 px-4 border border-red-900/60 text-red-400 font-medium rounded-full text-sm hover:bg-red-950/40 transition"
          >
            Eliminar cliente
          </button>
        ) : (
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-red-900/50 bg-red-950/20">
            <p className="text-xs text-neutral-300">
              Escribí <span className="font-mono text-red-300">ELIMINAR</span> para confirmar la eliminación de <span className="font-medium">{defaultName}</span>.
            </p>
            <input
              className={inputClass}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || confirmText !== 'ELIMINAR'}
                className="py-2.5 px-4 bg-red-600 text-white font-medium rounded-full text-sm disabled:opacity-30 hover:bg-red-500 transition"
              >
                {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); setConfirmText(''); setError('') }}
                disabled={deleting}
                className="py-2.5 px-4 border border-neutral-700 text-neutral-300 font-medium rounded-full text-sm hover:bg-neutral-900 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {error && confirmDelete && <p className="text-red-400 text-xs mt-3">{error}</p>}
      </div>
    </div>
  )
}
