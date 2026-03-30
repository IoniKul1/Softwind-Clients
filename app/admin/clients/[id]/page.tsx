import EditClientForm from './EditClientForm'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*, projects(id, name, framer_project_url)')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: { user } } = await adminClient.auth.admin.getUserById(id)

  const project = (profile as any).projects?.[0] ?? null

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/admin"
        className="text-xs text-neutral-500 hover:text-white -mb-4 inline-block"
      >
        ← Volver a clientes
      </Link>
      {project && (
        <Link
          href={`/admin/clients/${id}/collections`}
          className="inline-flex items-center gap-2 self-start border border-neutral-700 rounded-full px-5 py-2 text-sm hover:border-neutral-500 transition"
        >
          Ver CMS →
        </Link>
      )}
      <EditClientForm
        id={id}
        defaultName={profile.name}
        defaultEmail={user?.email ?? ''}
        defaultProjectName={project?.name ?? ''}
        defaultFramerProjectUrl={project?.framer_project_url ?? ''}
        projectId={project?.id ?? null}
      />
    </div>
  )
}
