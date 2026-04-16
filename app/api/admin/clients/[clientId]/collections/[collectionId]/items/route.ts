import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'
import { createItemAndPublish } from '@/lib/framer'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; collectionId: string }> }
) {
  const { clientId, collectionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data: project } = await adminClient
    .from('projects')
    .select('framer_project_url, framer_api_key_encrypted')
    .eq('client_user_id', clientId)
    .single()

  if (!project) return NextResponse.json({ error: 'No project found' }, { status: 404 })

  const { slug, fieldData } = await req.json()
  const apiKey = decrypt(project.framer_api_key_encrypted)

  try {
    await createItemAndPublish(project.framer_project_url, apiKey, collectionId, { slug, fieldData })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
