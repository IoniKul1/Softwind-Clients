import { createAdminClient } from '@/lib/supabase/admin'
import { syncNotionStatuses } from '@/lib/notion-sync'
import KanbanBoard from './KanbanBoard'

export default async function AdminRequestsDashboard() {
  // Sync Notion statuses before rendering
  await syncNotionStatuses().catch(console.error)

  const adminClient = createAdminClient()

  const [{ data: requests }, { data: profiles }, { data: projects }] = await Promise.all([
    adminClient
      .from('change_requests')
      .select('id, client_user_id, title, description, status, assigned_to, attachments, created_at')
      .order('created_at', { ascending: false }),
    adminClient.from('profiles').select('id, name'),
    adminClient.from('projects').select('client_user_id, name'),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.name]))
  const projectMap = Object.fromEntries((projects ?? []).map(p => [p.client_user_id, p.name]))

  const dbId = process.env.NOTION_DATABASE_ID
  const notionUrl = dbId ? `https://www.notion.so/${dbId.replace(/-/g, '')}` : null

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold mb-1">Pedidos de cambios</h1>
        <p className="text-neutral-500 text-sm">Los estados se sincronizan automáticamente desde Notion.</p>
      </div>
      <KanbanBoard
        initialRequests={requests ?? []}
        profileMap={profileMap}
        projectMap={projectMap}
        notionUrl={notionUrl}
      />
    </div>
  )
}
