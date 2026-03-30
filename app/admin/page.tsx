import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminPage() {
  const adminClient = createAdminClient()

  const [
    { data: profiles },
    { data: projects },
    { data: { users } },
  ] = await Promise.all([
    adminClient.from('profiles').select('id, name, created_at').eq('role', 'client').order('created_at', { ascending: false }),
    adminClient.from('projects').select('client_user_id, name'),
    adminClient.auth.admin.listUsers(),
  ])

  const projectByClient = Object.fromEntries((projects ?? []).map(p => [p.client_user_id, p.name]))
  const emailMap = Object.fromEntries(users.map(u => [u.id, u.email]))

  return (
    <div>
      {!profiles?.length && (
        <p className="text-neutral-500 text-sm">No hay clientes todavía.</p>
      )}
      <div className="flex flex-col gap-3">
        {profiles?.map((p) => (
          <Link
            key={p.id}
            href={`/admin/clients/${p.id}`}
            className="flex items-center justify-between border border-neutral-800 rounded-xl px-5 py-4 hover:border-neutral-600 transition"
          >
            <div>
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-neutral-500 text-xs mt-0.5">{emailMap[p.id] ?? '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-400">{projectByClient[p.id] ?? 'Sin proyecto'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
