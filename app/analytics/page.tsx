import { createClient } from '@/lib/supabase/server'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('analytics_data, analytics_updated_at')
    .eq('client_user_id', user!.id)
    .single()

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Analytics</h1>
      <p className="text-neutral-500 text-sm mb-8">Métricas de tu sitio web</p>

      {project?.analytics_data ? (
        <AnalyticsDashboard data={project.analytics_data} />
      ) : (
        <div className="border border-neutral-800 rounded-xl px-6 py-10 text-center">
          <p className="text-neutral-400 text-sm">No hay datos de analytics todavía.</p>
          <p className="text-neutral-600 text-xs mt-1">Tu administrador puede cargarlos desde el panel de admin.</p>
        </div>
      )}
    </div>
  )
}
