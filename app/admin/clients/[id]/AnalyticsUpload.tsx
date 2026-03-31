'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function AnalyticsUpload({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError('')
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch(`/api/admin/clients/${clientId}/analytics`, { method: 'POST', body: fd })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al procesar')
    } else {
      setFile(null)
      if (ref.current) ref.current.value = ''
      router.refresh()
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        onChange={e => { setFile(e.target.files?.[0] ?? null); setError('') }}
        className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-neutral-800 file:text-neutral-300 hover:file:bg-neutral-700 file:cursor-pointer"
      />
      {file && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="py-1.5 px-4 bg-brand hover:bg-brand-hover text-white rounded-full text-xs disabled:opacity-40 transition shrink-0"
        >
          {loading ? 'Procesando...' : 'Actualizar →'}
        </button>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
