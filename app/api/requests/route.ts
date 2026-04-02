import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const NOTION_VERSION = '2022-06-28'
const PEOPLE_DB_ID = '2a5df5a885468076b9fecc275ad2d4fb'

async function findNotionClientId(apiKey: string, projectName: string): Promise<string | null> {
  const res = await fetch(`https://api.notion.com/v1/databases/${PEOPLE_DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      filter: {
        property: 'Nombre',
        title: { equals: projectName },
      },
      page_size: 1,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.results?.[0]?.id ?? null
}

function buildAttachmentBlocks(attachments: { url: string; name: string; type: string }[]) {
  if (!attachments?.length) return []

  const blocks: any[] = [
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Adjuntos' } }],
      },
    },
  ]

  for (const att of attachments) {
    if (att.type === 'image') {
      blocks.push({
        object: 'block',
        type: 'image',
        image: { type: 'external', external: { url: att.url } },
      })
    } else {
      blocks.push({
        object: 'block',
        type: 'bookmark',
        bookmark: { url: att.url, caption: [{ type: 'text', text: { content: att.name } }] },
      })
    }
  }

  return blocks
}

async function createNotionTicket({
  title,
  description,
  projectName,
  attachments,
}: {
  title: string
  description: string | null
  projectName: string
  attachments: { url: string; name: string; type: string }[]
}) {
  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!apiKey || !databaseId) return

  const clientPageId = await findNotionClientId(apiKey, projectName)

  const properties: Record<string, any> = {
    'Ticket': {
      title: [{ text: { content: title } }],
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
  }

  if (clientPageId) {
    properties['Cliente'] = {
      relation: [{ id: clientPageId }],
    }
  }

  const children: any[] = []

  if (description) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: description } }],
      },
    })
  }

  children.push(...buildAttachmentBlocks(attachments))

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
      children: children.length > 0 ? children : undefined,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error('Notion error:', JSON.stringify(err))
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, attachments } = await req.json()
  if (!title) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

  const adminClient = createAdminClient()

  const { data: project } = await adminClient
    .from('projects')
    .select('name')
    .eq('client_user_id', user.id)
    .single()

  const { error } = await supabase.from('change_requests').insert({
    client_user_id: user.id,
    title,
    description: description || null,
    attachments: attachments ?? [],
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  createNotionTicket({
    title,
    description: description || null,
    projectName: project?.name ?? '',
    attachments: attachments ?? [],
  }).catch(console.error)

  return NextResponse.json({ ok: true })
}
