import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getCollections } from '@/lib/framer'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('framer_project_url, framer_api_key_encrypted, analytics_data, analytics_updated_at')
    .eq('client_user_id', user!.id)
    .single()

  if (!project) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-neutral-400 text-sm">Tu cuenta todavía no tiene un proyecto asignado.</p>
        <p className="text-neutral-600 text-xs">Contactá a tu administrador para que configure tu proyecto.</p>
      </div>
    )
  }

  let collections: Awaited<ReturnType<typeof getCollections>> = []
  try {
    const apiKey = decrypt(project.framer_api_key_encrypted)
    collections = await getCollections(project.framer_project_url, apiKey)
  } catch (e: any) {
    return <p className="text-red-400 text-sm">Error al conectar con Framer: {e?.message ?? String(e)}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {collections.length === 0 && <p className="text-neutral-500 text-sm">No hay colecciones en este proyecto.</p>}
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

      {project.analytics_data && (
        <AnalyticsDashboard data={project.analytics_data} />
      )}
    </div>
  )
}
