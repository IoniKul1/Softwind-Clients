import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import ClientTabNav from './ClientTabNav'

export default async function ClientDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, name')
    .eq('id', id)
    .maybeSingle()

  if (!profile) notFound()

  const { data: project } = await adminClient
    .from('projects')
    .select('name')
    .eq('client_user_id', id)
    .maybeSingle()

  const displayName = project?.name ?? profile.name

  return (
    <div className="flex flex-col min-h-full">
      <div className="mb-6">
        <p className="text-xs text-neutral-500 mb-1">Cliente</p>
        <h1 className="text-xl font-semibold text-white">{displayName}</h1>
        {project?.name && (
          <p className="text-sm text-neutral-500 mt-0.5">{profile.name}</p>
        )}
      </div>
      <ClientTabNav clientId={id} />
      <div className="mt-6">
        {children}
      </div>
    </div>
  )
}
