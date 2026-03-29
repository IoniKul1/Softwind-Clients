import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getCollections } from '@/lib/framer'

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('framer_project_url, framer_api_key_encrypted')
    .eq('client_user_id', user!.id)
    .single()

  if (!project) {
    return <p className="text-neutral-500 text-sm">No tenés ningún proyecto configurado todavía.</p>
  }

  const apiKey = decrypt(project.framer_api_key_encrypted)
  const collections = await getCollections(project.framer_project_url, apiKey)

  return (
    <div className="flex flex-col gap-3">
      {collections.map((col) => (
        <Link
          key={col.id}
          href={`/collections/${col.id}`}
          className="flex items-center justify-between border border-neutral-800 rounded-xl px-5 py-4 hover:border-neutral-600 transition"
        >
          <span className="font-medium text-sm">{col.name}</span>
          <span className="text-neutral-500 text-xs">→</span>
        </Link>
      ))}
    </div>
  )
}
