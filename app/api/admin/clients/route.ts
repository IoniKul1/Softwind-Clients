import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  // Verify admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, email, projectName, framerProjectUrl, framerApiKey } = await req.json()

  if (!name || !email || !projectName || !framerProjectUrl || !framerApiKey) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Invite user — sends magic link email, sets role in app_metadata
  const { data: { user: newUser }, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role: 'client' },
  })

  if (inviteError || !newUser) {
    return NextResponse.json({ error: inviteError?.message ?? 'Error al crear usuario' }, { status: 500 })
  }

  // Set app_metadata.role (inviteUserByEmail puts data in user_metadata, not app_metadata)
  const { error: updateError } = await adminClient.auth.admin.updateUserById(newUser.id, {
    app_metadata: { role: 'client' },
  })
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Create profile
  const { error: profileError } = await adminClient.from('profiles').insert({
    id: newUser.id,
    role: 'client',
    name,
  })
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Create project with encrypted API key
  const { error: projectError } = await adminClient.from('projects').insert({
    client_user_id: newUser.id,
    name: projectName,
    framer_project_url: framerProjectUrl,
    framer_api_key_encrypted: encrypt(framerApiKey),
  })

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
