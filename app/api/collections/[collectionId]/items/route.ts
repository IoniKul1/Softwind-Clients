import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { createItemAndPublish } from '@/lib/framer'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(
  req: NextRequest,
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

  if (!project) return NextResponse.json({ error: 'No project found' }, { status: 404 })

  const { slug, fieldData } = await req.json()
  const apiKey = decrypt(project.framer_api_key_encrypted)

  try {
    await createItemAndPublish(project.framer_project_url, apiKey, collectionId, { slug, fieldData })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[items:create] failed:', e)
    return NextResponse.json(
      { error: 'Los servidores de Framer parecen estar caídos. Volvé a intentarlo en unos minutos.' },
      { status: 503 }
    )
  }
}
