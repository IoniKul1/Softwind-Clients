'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    projectName: '',
    framerProjectUrl: '',
    framerApiKey: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al crear el cliente')
    } else {
      router.push('/admin')
    }
  }

  const inputClass = "bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition w-full"
  const labelClass = "text-xs text-neutral-400 mb-1 block"

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-semibold mb-6">Nuevo cliente</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Nombre</label>
          <input className={inputClass} value={form.name}
            onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" className={inputClass} value={form.email}
            onChange={e => set('email', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Contraseña inicial</label>
          <input type="password" className={inputClass} value={form.password}
            onChange={e => set('password', e.target.value)} required minLength={8} />
        </div>
        <hr className="border-neutral-800" />
        <div>
          <label className={labelClass}>Nombre del proyecto</label>
          <input className={inputClass} value={form.projectName}
            onChange={e => set('projectName', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Framer Project URL</label>
          <input className={inputClass} value={form.framerProjectUrl}
            onChange={e => set('framerProjectUrl', e.target.value)}
            placeholder="https://framer.com/projects/..." required />
        </div>
        <div>
          <label className={labelClass}>Framer API Key</label>
          <input type="password" className={inputClass} value={form.framerApiKey}
            onChange={e => set('framerApiKey', e.target.value)}
            placeholder="fr_..." required />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-3 bg-white text-black font-medium rounded-full text-sm disabled:opacity-30 hover:bg-neutral-200 transition mt-2"
        >
          {loading ? 'Creando...' : 'Crear cliente →'}
        </button>
      </form>
    </div>
  )
}
