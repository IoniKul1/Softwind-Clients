'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewRequestForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    setForm({ title: '', description: '' })
    setOpen(false)
    router.refresh()
  }

  const inputClass = "bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-700 outline-none focus:border-neutral-600 transition w-full"

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="py-3 px-6 bg-brand hover:bg-brand-hover text-white font-medium rounded-xl text-sm transition"
      >
        + Nuevo pedido
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
      <h3 className="text-sm font-medium">Nuevo pedido de cambio</h3>
      <div>
        <label className="text-xs text-neutral-500 mb-1.5 block">Título</label>
        <input
          className={inputClass}
          placeholder="Ej: Actualizar sección de precios"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs text-neutral-500 mb-1.5 block">Descripción <span className="text-neutral-700">(opcional)</span></label>
        <textarea
          className={`${inputClass} resize-none h-24`}
          placeholder="Describí los cambios que necesitás..."
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !form.title}
          className="py-2.5 px-5 bg-brand hover:bg-brand-hover text-white font-medium rounded-xl text-sm disabled:opacity-30 transition"
        >
          {loading ? 'Enviando...' : 'Enviar pedido →'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="py-2.5 px-5 border border-neutral-800 hover:border-neutral-600 rounded-xl text-sm transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
