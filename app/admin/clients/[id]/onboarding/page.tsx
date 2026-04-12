import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import AdminOnboardingTab from '@/components/admin/AdminOnboardingTab'
import type { ProjectStatus, ProjectStage, OnboardingData } from '@/lib/types'

export default async function AdminOnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { data: project } = await adminClient
    .from('projects')
    .select('id, stage, project_status, onboarding_data, admin_notes, meeting_file_url')
    .eq('client_user_id', id)
    .maybeSingle()

  if (!project) notFound()

  return (
    <AdminOnboardingTab
      clientId={id}
      project={{
        id: project.id,
        stage: project.stage as ProjectStage,
        project_status: project.project_status as ProjectStatus,
        onboarding_data: (project.onboarding_data ?? {}) as OnboardingData,
        admin_notes: project.admin_notes ?? undefined,
        meeting_file_url: project.meeting_file_url ?? undefined,
      }}
    />
  )
}
