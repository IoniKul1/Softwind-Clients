import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'
import { getItems } from '@/lib/framer'
import { notFound } from 'next/navigation'

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
  const items = await getItems(project.framer_project_url, apiKey, collectionId)

  return (
    <div>
      <Link href={`/admin/clients/${clientId}/collections`} className="text-xs text-neutral-500 hover:text-white mb-6 inline-block">
        ← Volver a colecciones
      </Link>
      <div className="flex flex-col gap-3 mt-4">
        {items.length === 0 && (
          <p className="text-neutral-500 text-sm">No hay items en esta colección.</p>
        )}
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/admin/clients/${clientId}/collections/${collectionId}/${item.id}`}
            className="flex items-center justify-between border border-neutral-800 rounded-xl px-5 py-4 hover:border-neutral-600 transition"
          >
            <div>
              <span className="font-medium text-sm">{item.slug}</span>
              {item.draft && (
                <span className="ml-2 text-xs text-yellow-500 border border-yellow-700 rounded px-1">borrador</span>
              )}
            </div>
            <span className="text-neutral-500 text-xs">Editar →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
