import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getCollectionFields, getItems } from '@/lib/framer'
import { notFound } from 'next/navigation'
import ItemEditClient from './ItemEditClient'
import Link from 'next/link'

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>
}) {
  const { id: collectionId, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('framer_project_url, framer_api_key_encrypted')
    .eq('client_user_id', user!.id)
    .single()

  if (!project) notFound()

  const apiKey = decrypt(project.framer_api_key_encrypted)
  const [fields, items] = await Promise.all([
    getCollectionFields(project.framer_project_url, apiKey, collectionId),
    getItems(project.framer_project_url, apiKey, collectionId),
  ])

  const item = items.find((i) => i.id === itemId)
  if (!item) notFound()

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href={`/collections/${collectionId}`} className="text-xs text-neutral-500 hover:text-white mb-6 inline-block">
        ← Volver
      </Link>
      <h2 className="text-xl font-semibold mb-6">{item.slug}</h2>
      <ItemEditClient
        collectionId={collectionId}
        item={item}
        fields={fields}
      />
    </div>
  )
}
