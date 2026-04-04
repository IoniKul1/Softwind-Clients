export const runtime = 'nodejs'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { publishProject } from '@/lib/framer'

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
    .select('framer_project_url, framer_api_key_encrypted')
    .eq('client_user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'No project found' }, { status: 404 })

  const apiKey = decrypt(project.framer_api_key_encrypted)

  try {
    await publishProject(project.framer_project_url, apiKey)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
