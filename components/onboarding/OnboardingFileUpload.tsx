'use client'
import { useState } from 'react'

interface Props {
  label: string
  currentUrl?: string
  accept?: string
  uploadKeyPrefix: string // e.g., 'onboarding/user-id/brand/logo'
  onUploaded: (url: string) => void
}

export default function OnboardingFileUpload({ label, currentUrl, accept, uploadKeyPrefix, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const key = `${uploadKeyPrefix}/${Date.now()}.${ext}`
      const res = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type)}`)
      if (!res.ok) throw new Error('Error al obtener URL de subida')
      const { url } = await res.json()
      const uploadRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!uploadRes.ok) throw new Error('Error al subir archivo')
      const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
      onUploaded(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
      {currentUrl && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:underline block mb-2 truncate"
        >
          Archivo actual ↗
        </a>
      )}
      <input
        type="file"
        accept={accept}
        onChange={handleFile}
        disabled={uploading}
        className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-neutral-800 file:text-neutral-200 file:text-xs hover:file:bg-neutral-700 transition disabled:opacity-50"
      />
      {uploading && <p className="text-xs text-neutral-500 mt-1">Subiendo...</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
