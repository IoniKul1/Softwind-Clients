import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_SECTIONS = ['brand', 'typography', 'colors', 'references', 'previous_site', 'content', 'business']

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { section, data } = body as { section?: string; data?: unknown }

  if (!section || !VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: project, error: fetchError } = await adminClient
    .from('projects')
    .select('id, onboarding_data')
    .eq('client_user_id', user.id)
    .single()

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const current = (project.onboarding_data as Record<string, unknown>) ?? {}
  const updated = { ...current, [section]: data }

  const { error: updateError } = await adminClient
    .from('projects')
    .update({ onboarding_data: updated })
    .eq('id', project.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
