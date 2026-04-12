import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProjectStatus, ProjectStage } from '@/lib/types'

const VALID_STATUSES: ProjectStatus[] = [
  'pago_recibido',
  'en_desarrollo',
  'esperando_feedback',
  'entregado',
  'entregado_sin_mantenimiento',
  'entregado_con_mantenimiento',
]
const VALID_STAGES: ProjectStage[] = ['development', 'production']

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { clientId, project_status, stage, admin_notes, meeting_file_url } = body as {
    clientId?: string
    project_status?: ProjectStatus
    stage?: ProjectStage
    admin_notes?: string
    meeting_file_url?: string
  }

  if (!clientId) return NextResponse.json({ error: 'Falta clientId' }, { status: 400 })
  if (project_status && !VALID_STATUSES.includes(project_status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }
  if (stage && !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Etapa inválida' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (project_status !== undefined) updates.project_status = project_status
  if (stage !== undefined) updates.stage = stage
  if (admin_notes !== undefined) updates.admin_notes = admin_notes
  if (meeting_file_url !== undefined) updates.meeting_file_url = meeting_file_url

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('projects')
    .update(updates)
    .eq('client_user_id', clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
