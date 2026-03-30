import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'
import { getCollectionFields } from '@/lib/framer'
import { notFound } from 'next/navigation'
import ItemCreateClient from '@/components/ItemCreateClient'
import Link from 'next/link'

export default async function AdminNewItemPage({
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
  const fields = await getCollectionFields(project.framer_project_url, apiKey, collectionId)
  const plainFields = JSON.parse(JSON.stringify(fields))

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link
        href={`/admin/clients/${clientId}/collections/${collectionId}`}
        className="text-xs text-neutral-500 hover:text-white mb-6 inline-block"
      >
        ← Volver
      </Link>
      <h2 className="text-xl font-semibold mb-6">Nuevo item</h2>
      <ItemCreateClient
        collectionId={collectionId}
        fields={plainFields}
        createUrl={`/api/admin/clients/${clientId}/collections/${collectionId}/items`}
        backUrl={`/admin/clients/${clientId}/collections/${collectionId}`}
        uploadBasePrefix={`clients/${clientId}/${collectionId}`}
      />
    </div>
  )
}
