import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { updateItemAndPublish, deleteItemAndPublish } from '@/lib/framer'
import { deleteByPrefix } from '@/lib/r2'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string; itemId: string }> }
) {
  const { collectionId, itemId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('projects')
    .select('framer_project_url, framer_api_key_encrypted')
    .eq('client_user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'No project found' }, { status: 404 })

  const { slug, draft, fieldData } = await req.json()
  const apiKey = decrypt(project.framer_api_key_encrypted)

  try {
    await updateItemAndPublish(project.framer_project_url, apiKey, collectionId, {
      id: itemId,
      slug,
      draft,
      fieldData,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string; itemId: string }> }
) {
  const { collectionId, itemId } = await params

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
  const slug = req.nextUrl.searchParams.get('slug')

  try {
    await deleteItemAndPublish(project.framer_project_url, apiKey, collectionId, itemId)
    if (slug) {
      await deleteByPrefix(`clients/${user.id}/${collectionId}/${slug}/`).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
