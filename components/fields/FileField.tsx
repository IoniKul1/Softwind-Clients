'use client'

import { useState } from 'react'

interface Props {
  fieldId: string
  label: string
  value: { url: string; name?: string } | null
  onChange: (value: { url: string; name: string }) => void
}

export function FileField({ fieldId, label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    const key = `uploads/${fieldId}/${Date.now()}-${file.name}`
    const res = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${file.type}`)
    const { url: presignedUrl } = await res.json()
    await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
    onChange({ url: `${publicBase}/${key}`, name: file.name })
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <div className="flex items-center gap-3">
        {value?.name && <span className="text-sm text-neutral-400 truncate max-w-[200px]">{value.name}</span>}
        <label className="px-4 py-2 border border-neutral-700 rounded-lg text-xs cursor-pointer hover:border-neutral-500 transition">
          {uploading ? 'Subiendo...' : 'Elegir archivo'}
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}
