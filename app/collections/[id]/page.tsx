import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getCollectionData } from '@/lib/framer'
import ItemsView from './ItemsView'

export default async function ItemsPage({ params }: { params: Promise<{ id: string }> }) {
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
  const { fields, items } = await getCollectionData(project.framer_project_url, apiKey, collectionId)

  return (
    <ItemsView
      collectionId={collectionId}
      items={items}
      fields={fields}
    />
  )
}
