// app/onboarding/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectTimeline from '@/components/onboarding/ProjectTimeline'
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist'
import type { ProjectStatus, OnboardingData } from '@/lib/types'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('project_status, onboarding_data')
    .eq('client_user_id', user.id)
    .maybeSingle()

  const status = (project?.project_status ?? 'pago_recibido') as ProjectStatus
  const onboardingData = (project?.onboarding_data ?? {}) as OnboardingData

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-2">Bienvenido</h1>
      <p className="text-neutral-500 text-sm mb-8">
        Estamos construyendo tu sitio. Completá tu información para ayudarnos a diseñarlo.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectTimeline status={status} />
        <OnboardingChecklist data={onboardingData} />
      </div>
    </div>
  )
}
