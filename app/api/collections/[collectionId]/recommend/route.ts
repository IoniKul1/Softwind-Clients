export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildSeeds, collectSuggestions } from '@/lib/autocomplete'
import type { OnboardingData } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Sos NOA, la IA de Softwind (agencia de diseño web argentina) y experta en SEO para sitios del mercado hispanohablante (priorizando Argentina y LatAm).

Tu tarea: proponer UN tema de blog con alto potencial de posicionamiento orgánico para el cliente específico que se te describe.

Criterios que debés aplicar (en este orden):
1. Evidencia: si se te entrega una lista de "Búsquedas reales en Google", ANCLÁ la recomendación en una de esas queries. Son lo que la gente tipea hoy.
2. Intención de búsqueda: priorizá keywords informacionales o comerciales con intención clara ("cómo", "cuánto cuesta", "mejores", "guía", "vs", "para"). Evitá temas vagos o inspiracionales.
3. Relevancia al negocio: el tema tiene que atraer a los clientes potenciales descritos, no a cualquiera.
4. Long-tail específico (3-5 palabras) antes que cabeceras genéricas. Un nicho bien acotado rankea antes que uno genérico.
5. Conversión: el lector del artículo tiene que poder convertirse en cliente del negocio descrito.
6. Localización: si el cliente es regional, incluí geo-modificadores (Argentina, Buenos Aires, CABA) cuando corresponda.

Devolvé SOLO este JSON, sin markdown, sin texto adicional:
{
  "title": "Título del blog que incluya la keyword principal de manera natural",
  "premise": "2-3 oraciones. Incluí: (a) la keyword principal entre comillas, (b) la intención de búsqueda detectada, (c) por qué este tema tiene potencial para este negocio específico. Si la keyword salió de autocomplete, mencionalo."
}`

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('projects')
    .select('name, website_url, onboarding_data')
    .eq('client_user_id', user.id)
    .single()

  const onboarding = (project?.onboarding_data ?? {}) as OnboardingData
  const business = onboarding.business ?? {}
  const competitors = (business.competitors ?? []).filter(Boolean).slice(0, 5)

  const seeds = buildSeeds(business.industry ?? '', business.audience)
  const suggestions = seeds.length > 0 ? await collectSuggestions(seeds) : []

  const contextLines = [
    project?.name && `Nombre del negocio: ${project.name}`,
    project?.website_url && `Sitio web: ${project.website_url}`,
    business.industry && `Industria / rubro: ${business.industry}`,
    business.audience && `Público objetivo: ${business.audience}`,
    business.tone && `Tono de comunicación: ${business.tone}`,
    competitors.length > 0 && `Competidores de referencia: ${competitors.join(', ')}`,
  ].filter(Boolean)

  const sections: string[] = []
  if (contextLines.length > 0) sections.push(`Cliente:\n${contextLines.join('\n')}`)
  if (suggestions.length > 0) {
    sections.push(`Búsquedas reales en Google (autocomplete, es-AR) asociadas al rubro:\n- ${suggestions.join('\n- ')}`)
  }

  const userMessage = sections.length > 0
    ? `${sections.join('\n\n')}\n\nProponé el tema óptimo.`
    : `Cliente: no hay datos de onboarding cargados. Asumí una PyME argentina genérica que necesita atraer clientes desde Google. Proponé el tema óptimo.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = (message.content[0] as any).text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Error al generar recomendación' }, { status: 500 })

  const { title, premise } = JSON.parse(jsonMatch[0])
  return NextResponse.json({ title, premise })
}
