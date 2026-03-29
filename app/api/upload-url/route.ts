import { NextRequest, NextResponse } from 'next/server'
import { getPresignedUploadUrl } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  // Verify authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  const contentType = searchParams.get('contentType') ?? 'application/octet-stream'

  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  try {
    const url = await getPresignedUploadUrl(key, contentType)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
