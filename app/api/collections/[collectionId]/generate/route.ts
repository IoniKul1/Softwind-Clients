export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  await params // required by Next.js even if unused
  const { topic, fields: clientFields } = await req.json()
  if (!topic?.trim()) return NextResponse.json({ error: 'Tema requerido' }, { status: 400 })
  if (!clientFields?.length) return NextResponse.json({ error: 'Sin campos' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use fields sent by the client — avoids a slow Framer connection
  const generatableTypes = ['string', 'formattedText']
  const targetFields = (clientFields as { id: string; name: string; type: string }[])
    .filter(f => generatableTypes.includes(f.type))

  if (targetFields.length === 0) {
    return NextResponse.json({ error: 'No hay campos de texto para generar' }, { status: 400 })
  }

  const fieldSchema = targetFields
    .map(f => `- "${f.name}" (${f.type === 'formattedText' ? 'rich text HTML' : 'plain text'})`)
    .join('\n')

  const prompt = `Sos NOA, la IA de Softwind. Escribís contenido de blog en español rioplatense, con tono profesional pero cercano.

Generá contenido para el siguiente tema: "${topic}"

Campos a completar:
${fieldSchema}

Reglas:
- Para campos "rich text HTML": usá HTML válido con <h2>, <h3>, <p>, <strong>, <em>, <ul>, <li>. Sin <html>/<body>/<head>.
- Para campos "plain text": solo texto plano, sin HTML.
- Incluí un campo "slug" con el slug URL del contenido (minúsculas, guiones, sin caracteres especiales).
- Escribí con profundidad y valor real para el lector.
- Devolvé SOLO JSON válido, sin explicaciones.

Formato de respuesta:
{
  "slug": "...",
  "Nombre del campo": "contenido..."
}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as any).text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Error al generar contenido' }, { status: 500 })

  const generated = JSON.parse(jsonMatch[0])

  const fieldData: Record<string, { type: string; value: string; contentType?: string }> = {}
  for (const f of targetFields) {
    const val = generated[f.name]
    if (typeof val === 'string') {
      fieldData[f.id] = f.type === 'formattedText'
        ? { type: 'formattedText', value: val, contentType: 'html' }
        : { type: f.type, value: val }
    }
  }

  return NextResponse.json({ slug: generated.slug ?? '', fieldData })
}
