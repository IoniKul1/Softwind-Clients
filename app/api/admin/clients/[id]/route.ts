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

  const { name, email, password, projectName, framerProjectUrl, framerApiKey, projectId } = await req.json()
  const adminClient = createAdminClient()

  // Update auth user (email + optional password)
  const authUpdate: Record<string, string> = { email }
  if (password) authUpdate.password = password
  await adminClient.auth.admin.updateUserById(id, authUpdate)

  // Update profile name
  await adminClient.from('profiles').update({ name }).eq('id', id)

  // Update project
  const projectUpdate: Record<string, string> = {
    name: projectName,
    framer_project_url: framerProjectUrl,
  }
  if (framerApiKey) {
    projectUpdate.framer_api_key_encrypted = encrypt(framerApiKey)
  }
  if (projectId) {
    await adminClient.from('projects').update(projectUpdate).eq('id', projectId)
  } else {
    await adminClient.from('projects').insert({
      client_user_id: id,
      ...projectUpdate,
      framer_api_key_encrypted: framerApiKey ? encrypt(framerApiKey) : '',
    })
  }

  return NextResponse.json({ ok: true })
}
