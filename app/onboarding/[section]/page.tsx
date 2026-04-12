// app/onboarding/[section]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import OnboardingSection from '@/components/onboarding/OnboardingSection'
import { ONBOARDING_SECTIONS } from '@/lib/onboarding'
import type { OnboardingData } from '@/lib/types'

export default async function OnboardingSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  const sectionConfig = ONBOARDING_SECTIONS.find(s => s.key === section)
  if (!sectionConfig) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('onboarding_data')
    .eq('client_user_id', user.id)
    .single()

  const onboardingData = (project?.onboarding_data ?? {}) as OnboardingData

  return (
    <div>
      <a href="/onboarding" className="text-xs text-neutral-500 hover:text-neutral-300 transition mb-6 block">
        ← Volver al panel
      </a>
      <OnboardingSection
        sectionKey={sectionConfig.key}
        label={sectionConfig.label}
        initialData={onboardingData}
        userId={user.id}
      />
    </div>
  )
}
