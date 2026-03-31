import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const adminClient = createAdminClient()
  const [{ data: profiles }, { data: { users } }] = await Promise.all([
    adminClient.from('profiles').select('id, name').eq('role', 'client').order('created_at', { ascending: false }),
    adminClient.auth.admin.listUsers(),
  ])

  const emailMap = Object.fromEntries(users.map(u => [u.id, u.email ?? '']))
  const clients = (profiles ?? []).map(p => ({
    id: p.id,
    name: p.name,
    email: emailMap[p.id] ?? '',
  }))

  return (
    <div className="flex min-h-screen">
      <AdminSidebar clients={clients} />
      <main className="flex-1 px-10 py-10 max-w-3xl">
        {children}
      </main>
    </div>
  )
}
