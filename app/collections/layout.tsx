// app/collections/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientSidebar from '@/components/ClientSidebar'
import { computeSidebarMode } from '@/lib/sidebar'

export default async function CollectionsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: project }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('projects').select('website_url, stage, onboarding_complete').eq('client_user_id', user.id).maybeSingle(),
  ])

  const mode = computeSidebarMode(project?.stage ?? 'development', project?.onboarding_complete ?? false)

  return (
    <div className="flex min-h-screen">
      <ClientSidebar
        name={profile?.name ?? 'Cliente'}
        websiteUrl={project?.website_url ?? null}
        mode={mode}
      />
      <main className="flex-1 px-4 py-6 pt-20 md:px-10 md:py-10 md:pt-10 min-w-0">
        {children}
      </main>
    </div>
  )
}
