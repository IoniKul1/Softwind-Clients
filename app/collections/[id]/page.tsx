import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getItems } from '@/lib/framer'

export default async function ItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: collectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('client_user_id', user!.id)
    .single()

  if (!project) return <p className="text-neutral-500 text-sm">Sin proyecto.</p>

  const apiKey = decrypt(project.framer_api_key_encrypted)
  const items = await getItems(project.framer_project_url, apiKey, collectionId)

  return (
    <div>
      <Link href="/collections" className="text-xs text-neutral-500 hover:text-white mb-6 inline-block">
        ← Volver
      </Link>
      <div className="flex flex-col gap-3 mt-4">
        {items.length === 0 && (
          <p className="text-neutral-500 text-sm">No hay items en esta colección.</p>
        )}
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/collections/${collectionId}/${item.id}`}
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
