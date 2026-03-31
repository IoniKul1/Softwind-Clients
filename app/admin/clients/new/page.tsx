'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicLink, setMagicLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    projectName: '',
    framerProjectUrl: '',
    websiteUrl: '',
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
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al crear el cliente')
    } else if (data.magicLink) {
      setMagicLink(data.magicLink)
    } else {
      router.push('/admin')
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(magicLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputClass = "bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition w-full"
  const labelClass = "text-xs text-neutral-400 mb-1 block"

  if (magicLink) {
    return (
      <div className="max-w-md">
        <h2 className="text-xl font-semibold mb-2">Cliente creado</h2>
        <p className="text-neutral-400 text-sm mb-6">
          Copiá este link y enviáselo a <span className="text-white">{form.email}</span>. Es de un solo uso y expira en 1 hora.
        </p>
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-xs break-all text-neutral-300 mb-4">
          {magicLink}
        </div>
        <div className="flex gap-3">
          <button
            onClick={copyLink}
            className="py-3 px-6 bg-white text-black font-medium rounded-full text-sm hover:bg-neutral-200 transition"
          >
            {copied ? 'Copiado ✓' : 'Copiar link'}
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="py-3 px-6 border border-neutral-700 rounded-full text-sm hover:border-neutral-500 transition"
          >
            Volver al admin
          </button>
        </div>
      </div>
    )
  }

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
          <label className={labelClass}>URL del sitio web <span className="text-neutral-600">(dominio publicado)</span></label>
          <input className={inputClass} value={form.websiteUrl}
            onChange={e => set('websiteUrl', e.target.value)}
            placeholder="https://ejemplo.com" />
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
          className="py-3 bg-brand text-white font-medium rounded-full text-sm disabled:opacity-30 hover:bg-brand-hover transition mt-2"
        >
          {loading ? 'Creando...' : 'Crear cliente →'}
        </button>
      </form>
    </div>
  )
}
