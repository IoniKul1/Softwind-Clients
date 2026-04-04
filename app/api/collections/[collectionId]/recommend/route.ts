export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Sos NOA, la IA de Softwind, una agencia de diseño web argentina.

Recomendá UN tema de blog relevante para una empresa que ofrece diseño y desarrollo web profesional. El tema debe:
- Ser útil para sus potenciales clientes (dueños de PyMEs, emprendedores, negocios locales)
- Tener potencial de posicionamiento y conversión
- Estar en español rioplatense

Respondé SOLO con este JSON, sin explicaciones:
{
  "title": "Título atractivo y específico del blog",
  "premise": "2-3 oraciones sobre el ángulo, el problema que resuelve y por qué leerlo"
}`
    }],
  })

  const raw = (message.content[0] as any).text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Error al generar recomendación' }, { status: 500 })

  const { title, premise } = JSON.parse(jsonMatch[0])
  return NextResponse.json({ title, premise })
}
