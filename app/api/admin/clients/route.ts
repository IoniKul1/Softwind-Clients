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

  // Create user without sending email
  const { data: { user: newUser }, error: createError } = await adminClient.auth.admin.createUser({
    email,
    app_metadata: { role: 'client' },
    email_confirm: true,
  })

  if (createError || !newUser) {
    return NextResponse.json({ error: createError?.message ?? 'Error al crear usuario' }, { status: 500 })
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
  let encryptedKey: string
  try {
    encryptedKey = encrypt(framerApiKey)
  } catch (e: any) {
    return NextResponse.json({ error: `Error al cifrar API key: ${e?.message ?? String(e)}` }, { status: 500 })
  }

  const { error: projectError } = await adminClient.from('projects').insert({
    client_user_id: newUser.id,
    name: projectName,
    framer_project_url: framerProjectUrl,
    framer_api_key_encrypted: encryptedKey,
  })
  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 })
  }

  // Generate magic link for the client to use
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${req.nextUrl.origin}/auth/callback`,
    },
  })

  const magicLink = linkError ? null : linkData?.properties?.action_link ?? null

  return NextResponse.json({ ok: true, magicLink })
}
