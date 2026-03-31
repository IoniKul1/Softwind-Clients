import EditClientForm from './EditClientForm'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const adminClient = createAdminClient()

  const [{ data: profile }, { data: projectRows }, { data: { user } }] = await Promise.all([
    adminClient.from('profiles').select('id, name').eq('id', id).single(),
    adminClient.from('projects').select('id, name, framer_project_url, website_url').eq('client_user_id', id),
    adminClient.auth.admin.getUserById(id),
  ])
  const project = projectRows?.[0] ?? null

  if (!profile) notFound()

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
        defaultWebsiteUrl={project?.website_url ?? ''}
        projectId={project?.id ?? null}
      />
    </div>
  )
}
