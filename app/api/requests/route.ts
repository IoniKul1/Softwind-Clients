import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

interface AttachmentInput {
  url: string
  name: string
  type: string
  annotations?: { id: string; x: number; y: number; w: number; h: number; label: string }[]
  notionUrl?: string
}

function buildAttachmentBlocks(attachments: AttachmentInput[]) {
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
        image: { type: 'external', external: { url: att.notionUrl ?? att.url } },
      })
      // Add numbered list of annotations below the image
      if (att.annotations?.length) {
        for (const ann of att.annotations) {
          if (!ann.label?.trim()) continue
          blocks.push({
            object: 'block',
            type: 'numbered_list_item',
            numbered_list_item: {
              rich_text: [{ type: 'text', text: { content: ann.label.trim() } }],
              color: 'default',
            },
          })
        }
      }
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

async function estimateMinutes(title: string, description: string | null): Promise<number> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `Estimá en minutos cuánto llevaría implementar este cambio en Framer (editor web visual).

Referencia:
- Cambio de texto o copy: 5-15 min
- Cambio de imagen o video: 10-20 min
- Ajuste de estilo, color o tipografía: 10-30 min
- Agregar o editar una sección: 30-60 min
- Nuevo componente o animación: 60-120 min
- Cambio estructural complejo: 90-180 min

Pedido:
Título: ${title}
Descripción: ${description ?? '(sin descripción)'}

Respondé SOLO con un número entero. Sin texto adicional.`,
      }],
    })
    const n = parseInt((message.content[0] as any).text.trim(), 10)
    return isNaN(n) ? 30 : Math.max(5, Math.min(480, n))
  } catch {
    return 30
  }
}

async function createNotionTicket({
  title,
  description,
  projectName,
  attachments,
  estimatedMinutes,
}: {
  title: string
  description: string | null
  projectName: string
  attachments: AttachmentInput[]
  estimatedMinutes: number
}): Promise<string | null> {
  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!apiKey || !databaseId) return null

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
    'minutos estimados': {
      number: estimatedMinutes,
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

  try {
    children.push(...buildAttachmentBlocks(attachments))
  } catch (e) {
    console.error('buildAttachmentBlocks failed:', e)
  }

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
    return null
  }

  const data = await res.json()
  return data.id as string
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  // Fetch notion_page_id before deleting
  const { data: request } = await supabase
    .from('change_requests')
    .select('notion_page_id')
    .eq('id', id)
    .eq('client_user_id', user.id)
    .single()

  const { error } = await supabase
    .from('change_requests')
    .delete()
    .eq('id', id)
    .eq('client_user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Set Notion status to "Eliminado"
  const notionPageId = request?.notion_page_id
  const apiKey = process.env.NOTION_API_KEY
  if (notionPageId && apiKey) {
    fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({ properties: { Status: { status: { name: 'Eliminado' } } } }),
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true })
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

  const { data: inserted, error } = await supabase
    .from('change_requests')
    .insert({
      client_user_id: user.id,
      title,
      description: description || null,
      attachments: attachments ?? [],
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Estimate minutes + create Notion ticket with a 20s overall timeout
  const requestId = inserted.id
  const timeout = <T>(ms: number, fallback: T): Promise<T> =>
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))

  try {
    const minutes = await Promise.race([estimateMinutes(title, description || null), timeout(8000, 30)])
    const notionPageId = await Promise.race([
      createNotionTicket({
        title,
        description: description || null,
        projectName: project?.name ?? '',
        attachments: attachments ?? [],
        estimatedMinutes: minutes,
      }),
      timeout(12000, null),
    ])
    if (notionPageId) {
      await adminClient
        .from('change_requests')
        .update({ notion_page_id: notionPageId })
        .eq('id', requestId)
    }
  } catch (err: any) {
    console.error('Notion ticket creation failed:', err?.message ?? err)
  }

  return NextResponse.json({ ok: true })
}
