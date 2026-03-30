'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
  defaultName: string
  defaultEmail: string
  defaultProjectName: string
  defaultFramerProjectUrl: string
  projectId: string | null
}

export default function EditClientForm({ id, defaultName, defaultEmail, defaultProjectName, defaultFramerProjectUrl, projectId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    projectName: defaultProjectName,
    framerProjectUrl: defaultFramerProjectUrl,
    framerApiKey: '',
  })

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

  const inputClass = "bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition w-full"
  const labelClass = "text-xs text-neutral-400 mb-1 block"

  return (
    <div className="max-w-md">
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
          <label className={labelClass}>
            Framer API Key {projectId ? <span className="text-neutral-600">(dejar vacío para no cambiar)</span> : <span className="text-red-400">*requerida</span>}
          </label>
          <input type="password" className={inputClass} value={form.framerApiKey} onChange={e => set('framerApiKey', e.target.value)} placeholder="fr_..." required={!projectId} />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button type="submit" disabled={loading}
          className="py-3 bg-white text-black font-medium rounded-full text-sm disabled:opacity-30 hover:bg-neutral-200 transition mt-2">
          {loading ? 'Guardando...' : 'Guardar cambios →'}
        </button>
      </form>
    </div>
  )
}
