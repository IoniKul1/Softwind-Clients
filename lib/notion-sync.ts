import { createAdminClient } from './supabase/admin'

const NOTION_VERSION = '2022-06-28'

type AppStatus = 'pending' | 'in_progress' | 'done'

function mapNotionStatus(notionStatus: string): AppStatus {
  switch (notionStatus) {
    case 'In progress':
    case 'QA':
      return 'in_progress'
    case 'Done':
      return 'done'
    default:
      return 'pending'
  }
}

async function fetchNotionPageStatus(apiKey: string, pageId: string): Promise<string | null> {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
    },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.properties?.Status?.status?.name ?? null
}

export async function syncNotionStatuses() {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return

  const adminClient = createAdminClient()

  // Fetch all requests that have a notion_page_id
  const { data: requests } = await adminClient
    .from('change_requests')
    .select('id, status, notion_page_id')
    .not('notion_page_id', 'is', null)

  if (!requests?.length) return

  await Promise.all(
    requests.map(async (req) => {
      const notionStatus = await fetchNotionPageStatus(apiKey, req.notion_page_id!)
      if (!notionStatus) return

      const appStatus = mapNotionStatus(notionStatus)
      if (appStatus === req.status) return

      await adminClient
        .from('change_requests')
        .update({ status: appStatus })
        .eq('id', req.id)
    })
  )
}
