'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Attachment {
  url: string
  name: string
  type: 'image' | 'file'
}

async function compressImage(file: File, quality = 0.4): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      // Max 1200px wide
      const maxW = 1200
      const scale = img.width > maxW ? maxW / img.width : 1
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        quality
      )
    }
    img.onerror = reject
    img.src = url
  })
}

async function uploadFile(file: File, userId: string): Promise<Attachment> {
  const isImage = file.type.startsWith('image/')
  const ext = isImage ? 'jpg' : file.name.split('.').pop() ?? 'bin'
  const key = `requests/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const contentType = isImage ? 'image/jpeg' : file.type || 'application/octet-stream'

  // Get presigned URL
  const res = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`)
  const { url } = await res.json()

  // Compress if image, else upload as-is
  const body = isImage ? await compressImage(file) : file
  await fetch(url, { method: 'PUT', body, headers: { 'Content-Type': contentType } })

  const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
  return {
    url: `${publicBase}/${key}`,
    name: file.name,
    type: isImage ? 'image' : 'file',
  }
}

export default function NewRequestForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setUploadError('')
    try {
      const uploaded = await Promise.all(Array.from(files).map(f => uploadFile(f, userId)))
      setAttachments(a => [...a, ...uploaded])
    } catch {
      setUploadError('Error al subir archivo. Intentá de nuevo.')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, attachments }),
    })
    setLoading(false)
    setForm({ title: '', description: '' })
    setAttachments([])
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

      {/* File upload */}
      <div>
        <label className="text-xs text-neutral-500 mb-1.5 block">
          Adjuntos <span className="text-neutral-700">(imágenes o archivos)</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={e => handleFiles(e.target.files)}
          className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-neutral-800 file:text-neutral-300 hover:file:bg-neutral-700 file:cursor-pointer w-full"
        />
        {uploading && <p className="text-xs text-neutral-500 mt-1.5">Subiendo y comprimiendo...</p>}
        {uploadError && <p className="text-xs text-red-400 mt-1.5">{uploadError}</p>}

        {/* Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {attachments.map((a, i) => (
              <div key={i} className="relative group">
                {a.type === 'image' ? (
                  <img
                    src={a.url}
                    alt={a.name}
                    className="w-16 h-16 object-cover rounded-lg border border-neutral-800"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-neutral-800 bg-neutral-900 flex flex-col items-center justify-center gap-1">
                    <span className="text-lg">📄</span>
                    <span className="text-[9px] text-neutral-600 text-center px-1 truncate w-full text-center">{a.name.split('.').pop()}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setAttachments(atts => atts.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-neutral-700 text-white text-[10px] hidden group-hover:flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || uploading || !form.title}
          className="py-2.5 px-5 bg-brand hover:bg-brand-hover text-white font-medium rounded-xl text-sm disabled:opacity-30 transition"
        >
          {loading ? 'Enviando...' : 'Enviar pedido →'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setAttachments([]) }}
          className="py-2.5 px-5 border border-neutral-800 hover:border-neutral-600 rounded-xl text-sm transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
