import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = (file.type || 'image/png') as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Extract all analytics data from this screenshot and return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "period": "string",
  "uniqueVisitors": number,
  "totalPageviews": number,
  "bounceRate": "string",
  "avgSession": "string",
  "sources": [{"name": "string", "visits": number}],
  "pages": [{"path": "string", "views": number}],
  "geography": [{"country": "string", "visits": number}],
  "devices": [{"type": "string", "visits": number}],
  "updatedAt": "${new Date().toISOString().split('T')[0]}"
}
For numbers like 1.9K use 1900, 2.2K use 2200, 1.6K use 1600, etc.`,
          },
        ],
      },
    ],
  })

  const text = (message.content[0] as any).text.trim()
  let analytics: Record<string, any>
  try {
    analytics = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse analytics from image' }, { status: 422 })
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('projects')
    .update({ analytics_data: analytics, analytics_updated_at: new Date().toISOString() })
    .eq('client_user_id', clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, analytics })
}
