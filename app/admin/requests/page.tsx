import { createAdminClient } from '@/lib/supabase/admin'
import KanbanBoard from './KanbanBoard'

export default async function AdminRequestsDashboard() {
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold mb-1">Pedidos de cambios</h1>
        <p className="text-neutral-500 text-sm">Arrastrá las cards para cambiar el estado.</p>
      </div>
      <KanbanBoard
        initialRequests={requests ?? []}
        profileMap={profileMap}
        projectMap={projectMap}
      />
    </div>
  )
}
