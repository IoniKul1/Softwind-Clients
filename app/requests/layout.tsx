import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientSidebar from '@/components/ClientSidebar'

export default async function RequestsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: projectRows }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('projects').select('website_url').eq('client_user_id', user.id),
  ])

  return (
    <div className="flex min-h-screen">
      <ClientSidebar
        name={profile?.name ?? 'Cliente'}
        websiteUrl={projectRows?.[0]?.website_url ?? null}
      />
      <main className="flex-1 px-10 py-10 max-w-3xl">
        {children}
      </main>
    </div>
  )
}
