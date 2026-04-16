import sharp from 'sharp'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export interface GeneratedImage {
  bytes: Buffer        // webp-encoded, compressed
  mimeType: 'image/webp'
}

// Call Gemini image-generation model, return a small webp-compressed buffer.
// Output is intentionally low-res / low-quality: this is a preview the user
// can approve, regenerate, or replace — no point spending bytes on a draft.
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  const model = process.env.GEMINI_IMAGE_MODEL
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY no está configurado')
  if (!model) throw new Error('GEMINI_IMAGE_MODEL no está configurado')

  const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gemini image API ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p: any) => p?.inlineData?.data)
  if (!imagePart) throw new Error('Gemini no devolvió imagen')

  const raw = Buffer.from(imagePart.inlineData.data, 'base64')
  const bytes = await sharp(raw)
    .resize({ width: 512, height: 512, fit: 'cover', position: 'attention' })
    .webp({ quality: 40 })
    .toBuffer()

  return { bytes, mimeType: 'image/webp' }
}

export function buildCoverPrompt(title: string, premise: string): string {
  return `Cover image for a blog post titled "${title}". Context: ${premise}. Style: editorial photo, soft natural lighting, clean minimal composition, wide shot, no text, no watermarks, no logos, no letters.`
}
