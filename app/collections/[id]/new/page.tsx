import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getCollectionFields } from '@/lib/framer'
import ItemCreateClient from '@/components/ItemCreateClient'
import Link from 'next/link'

export default async function NewItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: collectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('framer_project_url, framer_api_key_encrypted')
    .eq('client_user_id', user!.id)
    .single()

  if (!project) return <p className="text-neutral-500 text-sm">Sin proyecto.</p>

  const apiKey = decrypt(project.framer_api_key_encrypted)
  const fields = await getCollectionFields(project.framer_project_url, apiKey, collectionId)
  const plainFields = JSON.parse(JSON.stringify(fields))

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link
        href={`/collections/${collectionId}`}
        className="text-xs text-neutral-500 hover:text-white mb-6 inline-block"
      >
        ← Volver
      </Link>
      <h2 className="text-xl font-semibold mb-6">Nuevo item</h2>
      <ItemCreateClient
        collectionId={collectionId}
        fields={plainFields}
        createUrl={`/api/collections/${collectionId}/items`}
        backUrl={`/collections/${collectionId}`}
      />
    </div>
  )
}
