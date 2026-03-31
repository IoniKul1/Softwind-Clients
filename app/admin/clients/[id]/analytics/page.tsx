import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import AnalyticsUpload from '../AnalyticsUpload'

export default async function AdminClientAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { data: projectRows } = await adminClient
    .from('projects')
    .select('id, analytics_data, analytics_updated_at')
    .eq('client_user_id', id)

  const project = projectRows?.[0] ?? null
  if (!project) notFound()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold mb-1">Analytics</h1>
          <p className="text-neutral-500 text-sm">Métricas del sitio del cliente</p>
        </div>
        <AnalyticsUpload clientId={id} />
      </div>

      {project.analytics_data ? (
        <AnalyticsDashboard data={project.analytics_data} />
      ) : (
        <div className="border border-neutral-800 rounded-xl px-6 py-10 text-center">
          <p className="text-neutral-400 text-sm">No hay datos todavía.</p>
          <p className="text-neutral-600 text-xs mt-1">Subí un screenshot de Framer Analytics para extraer las métricas.</p>
        </div>
      )}
    </div>
  )
}
