export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getCollectionData } from '@/lib/framer'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  const { collectionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('projects')
    .select('framer_project_url, framer_api_key_encrypted')
    .eq('client_user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Sin proyecto' }, { status: 404 })

  const apiKey = decrypt(project.framer_api_key_encrypted)
  const { fields, items } = await getCollectionData(project.framer_project_url, apiKey, collectionId)

  // Extract existing titles and text content for context
  const textFields = fields.filter(f => f.type === 'string' || f.type === 'formattedText')
  const existingContent = items.slice(0, 10).map(item => {
    const parts: string[] = []
    for (const f of textFields) {
      const val = item.fieldData[f.id]?.value
      if (typeof val === 'string' && val.trim()) {
        parts.push(`${f.name}: ${val.replace(/<[^>]+>/g, '').slice(0, 200)}`)
      }
    }
    return parts.join(' | ')
  }).filter(Boolean)

  const prompt = `Sos NOA, la IA de Softwind, una agencia de diseño web argentina.

Analizá los siguientes blogs/artículos existentes de este cliente y recomendá UN nuevo tema que:
- Sea relevante para su audiencia y negocio
- Complemente lo que ya publicaron sin repetir
- Tenga potencial de posicionamiento y conversión

Contenido existente:
${existingContent.join('\n')}

Respondé SOLO con un JSON con este formato exacto, sin explicaciones:
{
  "title": "El título propuesto del blog (atractivo, específico, en español)",
  "premise": "2-3 oraciones explicando el ángulo, el problema que resuelve y por qué vale la pena escribirlo ahora"
}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as any).text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Error al generar recomendación' }, { status: 500 })

  const { title, premise } = JSON.parse(jsonMatch[0])
  return NextResponse.json({ title, premise })
}
