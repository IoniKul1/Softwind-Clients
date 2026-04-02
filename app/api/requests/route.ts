import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function createNotionTicket({ title, clientName }: { title: string; clientName: string }) {
  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!apiKey || !databaseId) return

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        'Ticket': {
          title: [{ text: { content: `[${clientName}] ${title}` } }],
        },
        'Status': {
          status: { name: 'Pendiente' },
        },
        'Oficina': {
          select: { name: 'Oficina It' },
        },
        'Select': {
          select: { name: 'Task' },
        },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error('Notion error:', err)
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, attachments } = await req.json()
  if (!title) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

  const adminClient = createAdminClient()

  // Fetch client name and ticket count in parallel
  const { data: profile } = await adminClient.from('profiles').select('name').eq('id', user.id).single()

  const { error } = await supabase.from('change_requests').insert({
    client_user_id: user.id,
    title,
    description: description || null,
    attachments: attachments ?? [],
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create Notion ticket (non-blocking — don't fail if Notion is down)
  createNotionTicket({
    title,
    clientName: profile?.name ?? 'Sin nombre',
  }).catch(console.error)

  return NextResponse.json({ ok: true })
}
