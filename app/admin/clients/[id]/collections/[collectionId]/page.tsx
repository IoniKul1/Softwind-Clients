import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'
import { getCollectionData } from '@/lib/framer'
import { notFound } from 'next/navigation'
import ItemsView from '@/app/collections/[id]/ItemsView'

export default async function AdminItemsPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string }>
}) {
  const { id: clientId, collectionId } = await params
  const adminClient = createAdminClient()

  const { data: project } = await adminClient
    .from('projects')
    .select('framer_project_url, framer_api_key_encrypted')
    .eq('client_user_id', clientId)
    .single()

  if (!project) notFound()

  const apiKey = decrypt(project.framer_api_key_encrypted)
  const { fields, items } = await getCollectionData(project.framer_project_url, apiKey, collectionId)

  return (
    <ItemsView
      collectionId={collectionId}
      clientId={clientId}
      items={items}
      fields={fields}
    />
  )
}
