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

  const { name, email, password, projectName, framerProjectUrl, framerApiKey } = await req.json()

  if (!name || !email || !password || !projectName || !framerProjectUrl || !framerApiKey) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Create auth user with role in app_metadata
  const { data: { user: newUser }, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    app_metadata: { role: 'client' },
    email_confirm: true,
  })

  if (createError || !newUser) {
    return NextResponse.json({ error: createError?.message ?? 'Error al crear usuario' }, { status: 500 })
  }

  // Create profile
  await adminClient.from('profiles').insert({
    id: newUser.id,
    role: 'client',
    name,
  })

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
