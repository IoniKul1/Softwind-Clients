'use client'

import { useState } from 'react'
import { compressImage } from '@/lib/compress-image'

interface Props {
  fieldId: string
  label: string
  value: Array<{ url: string }> | null
  onChange: (value: Array<{ url: string }>) => void
}

export function GalleryField({ fieldId, label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const urls = value ?? []

  async function handleFiles(files: FileList) {
    setUploading(true)
    const newUrls: Array<{ url: string }> = []
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file)
      const ext = compressed.type === 'image/webp' ? 'webp' : file.name.split('.').pop()
      const key = `uploads/${fieldId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const res = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(compressed.type)}`)
      const { url: presignedUrl } = await res.json()
      await fetch(presignedUrl, { method: 'PUT', body: compressed, headers: { 'Content-Type': compressed.type } })
      const publicBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
      newUrls.push({ url: `${publicBase}/${key}` })
    }
    onChange([...urls, ...newUrls])
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-neutral-400">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((img, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-700">
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(urls.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-black/70 rounded-full w-5 h-5 text-xs flex items-center justify-center"
            >×</button>
          </div>
        ))}
        <label className="aspect-square border-2 border-dashed border-neutral-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-neutral-500 transition">
          {uploading ? <span className="text-xs text-neutral-500">...</span> : <span className="text-neutral-600 text-2xl">+</span>}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}
