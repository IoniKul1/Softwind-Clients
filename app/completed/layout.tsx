// app/completed/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CompletedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('project_status')
    .eq('client_user_id', user.id)
    .maybeSingle()

  // Only sin_mantenimiento clients belong here
  if (project?.project_status !== 'entregado_sin_mantenimiento') {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      {children}
    </div>
  )
}
