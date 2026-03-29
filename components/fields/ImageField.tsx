'use client'

import { useState } from 'react'
import { compressImage } from '@/lib/compress-image'

interface Props {
  fieldId: string
  label: string
  value: { url: string } | null
  onChange: (value: { url: string }) => void
}

export function ImageField({ fieldId, label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    const compressed = await compressImage(file)
    const ext = compressed.type === 'image/webp' ? 'webp' : file.name.split('.').pop()
    const key = `uploads/${fieldId}/${Date.now()}.${ext}`

    const res = await fetch(`/api/upload-url?key=${key}&contentType=${compressed.type}`)
    const { url: presignedUrl } = await res.json()

    await fetch(presignedUrl, {
      method: 'PUT',
      body: compressed,
      headers: { 'Content-Type': compressed.type },
    })

    const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
    onChange({ url: `${publicBase}/${key}` })
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <div
        onClick={() => document.getElementById(`img-${fieldId}`)?.click()}
        className="border-2 border-dashed border-neutral-700 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-neutral-500 transition overflow-hidden relative"
      >
        <input
          id={`img-${fieldId}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
        {uploading ? (
          <span className="text-neutral-500 text-xs">Subiendo...</span>
        ) : value?.url ? (
          <img src={value.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-neutral-600 text-2xl">+</span>
        )}
      </div>
    </div>
  )
}
