// app/completed/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function CompletedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('stage, project_status')
    .eq('client_user_id', user.id)
    .maybeSingle()

  // Only production clients without maintenance belong here
  if (project?.stage !== 'production' || project?.project_status !== 'entregado_sin_mantenimiento') {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4">
      {children}
      <div className="mt-8">
        <LogoutButton />
      </div>
    </div>
  )
}
