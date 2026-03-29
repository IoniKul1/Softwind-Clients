import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Get all client profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, projects(name)')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  // Get auth users to show emails
  const { data: { users } } = await adminClient.auth.admin.listUsers()
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
              <p className="text-xs text-neutral-400">{(p as any).projects?.[0]?.name ?? 'Sin proyecto'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
