import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'
import { getCollections } from '@/lib/framer'
import { notFound } from 'next/navigation'

export default async function AdminCollectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  const adminClient = createAdminClient()

  const { data: project } = await adminClient
    .from('projects')
    .select('name, framer_project_url, framer_api_key_encrypted')
    .eq('client_user_id', clientId)
    .single()

  if (!project) notFound()

  const apiKey = decrypt(project.framer_api_key_encrypted)
  const collections = await getCollections(project.framer_project_url, apiKey)

  return (
    <div>
      <Link href={`/admin/clients/${clientId}`} className="text-xs text-neutral-500 hover:text-white mb-6 inline-block">
        ← Volver al cliente
      </Link>
      <h2 className="text-xl font-semibold mb-1 mt-4">{project.name}</h2>
      <p className="text-neutral-500 text-sm mb-6">Colecciones del proyecto</p>
      <div className="flex flex-col gap-3">
        {collections.length === 0 && (
          <p className="text-neutral-500 text-sm">No hay colecciones en este proyecto.</p>
        )}
        {collections.map((col) => (
          <Link
            key={col.id}
            href={`/admin/clients/${clientId}/collections/${col.id}`}
            className="flex items-center justify-between border border-neutral-800 rounded-xl px-5 py-4 hover:border-neutral-600 transition"
          >
            <span className="font-medium text-sm">{col.name}</span>
            <span className="text-neutral-500 text-xs">→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
