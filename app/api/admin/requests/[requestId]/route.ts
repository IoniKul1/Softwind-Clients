import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const update: Record<string, string> = { updated_at: new Date().toISOString() }

  if (body.status !== undefined) {
    if (!['pending', 'in_progress', 'done'].includes(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    update.status = body.status
  }

  if (body.assigned_to !== undefined) {
    const valid = ['Martin', 'Santiago', 'Yoni', null]
    if (!valid.includes(body.assigned_to)) {
      return NextResponse.json({ error: 'Asignado inválido' }, { status: 400 })
    }
    update.assigned_to = body.assigned_to
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('change_requests')
    .update(update)
    .eq('id', requestId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
