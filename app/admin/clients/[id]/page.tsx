import EditClientForm from './EditClientForm'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, projects(*)')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: { user } } = await adminClient.auth.admin.getUserById(id)

  const project = (profile as any).projects?.[0] ?? null

  return (
    <EditClientForm
      id={id}
      defaultName={profile.name}
      defaultEmail={user?.email ?? ''}
      defaultProjectName={project?.name ?? ''}
      defaultFramerProjectUrl={project?.framer_project_url ?? ''}
      projectId={project?.id ?? null}
    />
  )
}
