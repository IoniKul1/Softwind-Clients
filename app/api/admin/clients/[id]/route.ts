import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/crypto'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, email, projectName, framerProjectUrl, framerApiKey, websiteUrl, projectId } = await req.json()

  if (!name || !email || !projectName || !framerProjectUrl) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }
  if (!projectId && !framerApiKey) {
    return NextResponse.json({ error: 'Se requiere una Framer API Key para crear el proyecto' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Update auth user email
  const { error: authError } = await adminClient.auth.admin.updateUserById(id, { email })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Update profile name
  const { error: profileError } = await adminClient.from('profiles').update({ name }).eq('id', id)
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // Update or insert project
  const projectUpdate: Record<string, string> = {
    name: projectName,
    framer_project_url: framerProjectUrl,
    ...(websiteUrl !== undefined ? { website_url: websiteUrl } : {}),
  }
  if (framerApiKey) {
    try {
      projectUpdate.framer_api_key_encrypted = encrypt(framerApiKey)
    } catch (e: any) {
      return NextResponse.json({ error: `Error al cifrar API key: ${e?.message ?? String(e)}` }, { status: 500 })
    }
  }

  if (projectId) {
    const { error } = await adminClient.from('projects').update(projectUpdate).eq('id', projectId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await adminClient.from('projects').insert({
      client_user_id: id,
      ...projectUpdate,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Prevent an admin from deleting their own account
  if (user.id === id) {
    return NextResponse.json({ error: 'No podés eliminar tu propia cuenta' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Only allow deleting client accounts, never other admins
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', id).single()
  if (profile?.role === 'admin') {
    return NextResponse.json({ error: 'No se puede eliminar una cuenta de administrador' }, { status: 400 })
  }

  // Deleting the auth user cascades to profiles → projects → change_requests
  // (all referenced with `on delete cascade`)
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
