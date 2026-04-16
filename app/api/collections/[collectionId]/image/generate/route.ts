export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/gemini-image'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await req.json()
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'prompt requerido' }, { status: 400 })
  }

  try {
    const { bytes, mimeType } = await generateImage(prompt.trim())
    const dataUrl = `data:${mimeType};base64,${bytes.toString('base64')}`
    return NextResponse.json({ dataUrl, mimeType, size: bytes.length })
  } catch (e: any) {
    console.error('[image:generate] failed:', e)
    return NextResponse.json(
      { error: 'No pudimos generar la imagen. Probá de nuevo en un rato.' },
      { status: 503 }
    )
  }
}
