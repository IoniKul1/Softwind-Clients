import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getCollectionData } from '@/lib/framer'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  const { collectionId } = await params
  const { topic } = await req.json()
  if (!topic?.trim()) return NextResponse.json({ error: 'Tema requerido' }, { status: 400 })

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

  // Only generate for text-based editable fields
  const generatableTypes = ['string', 'formattedText']
  const targetFields = fields.filter(f => f.userEditable !== false && generatableTypes.includes(f.type))

  if (targetFields.length === 0) {
    return NextResponse.json({ error: 'No hay campos de texto para generar' }, { status: 400 })
  }

  // Build context from up to 3 existing items
  const examples = items.slice(0, 3).map(item => {
    const data: Record<string, string> = {}
    for (const f of targetFields) {
      const val = item.fieldData[f.id]?.value
      if (typeof val === 'string' && val.trim()) data[f.name] = val
    }
    return data
  }).filter(d => Object.keys(d).length > 0)

  const fieldSchema = targetFields.map(f => `- "${f.name}" (${f.type === 'formattedText' ? 'rich text HTML' : 'plain text'})`).join('\n')

  const examplesText = examples.length > 0
    ? `\nExisting content examples for tone/style reference:\n${JSON.stringify(examples, null, 2)}`
    : ''

  const prompt = `You are a content writer. Generate blog/CMS content in Spanish (Argentina) for the following topic: "${topic}".

Generate content for these fields:
${fieldSchema}
${examplesText}

Rules:
- Match the tone and style of the examples if provided
- For "rich text HTML" fields: return valid HTML using <h2>, <h3>, <p>, <strong>, <em>, <ul>, <li> tags. No <html>/<body>/<head> wrappers.
- For "plain text" fields: return plain text only, no HTML
- Return a JSON object where keys are the exact field names and values are the generated content
- Also include a "slug" key with a URL-friendly slug for the content (lowercase, hyphens, no special chars)
- Write naturally, with depth and value for the reader

Return ONLY valid JSON, no explanation.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as any).text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Error al generar contenido' }, { status: 500 })

  const generated = JSON.parse(jsonMatch[0])

  // Map field names back to field IDs
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
