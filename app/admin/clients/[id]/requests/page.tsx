import { createAdminClient } from '@/lib/supabase/admin'
import RequestStatusButton from './RequestStatusButton'

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Listo',
}
const statusColor: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  in_progress: 'text-brand bg-brand/10 border-brand/20',
  done: 'text-green-400 bg-green-400/10 border-green-400/20',
}
const nextStatus: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
}
const nextLabel: Record<string, string> = {
  pending: 'Marcar en curso →',
  in_progress: 'Marcar listo →',
  done: 'Reabrir',
}

export default async function AdminRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { data: requests } = await adminClient
    .from('change_requests')
    .select('id, title, description, status, created_at')
    .eq('client_user_id', id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold mb-1">Pedidos de cambios</h1>
        <p className="text-neutral-500 text-sm">Solicitudes enviadas por el cliente.</p>
      </div>

      <div className="flex flex-col gap-3">
        {!requests?.length && (
          <p className="text-neutral-600 text-sm">No hay pedidos todavía.</p>
        )}
        {requests?.map((r) => (
          <div key={r.id} className="border border-neutral-800 rounded-xl px-5 py-4">
            <div className="flex items-start justify-between gap-4 mb-1">
              <p className="font-medium text-sm">{r.title}</p>
              <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${statusColor[r.status]}`}>
                {statusLabel[r.status]}
              </span>
            </div>
            {r.description && (
              <p className="text-neutral-500 text-xs leading-relaxed mb-3">{r.description}</p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-neutral-700 text-xs">
                {new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <RequestStatusButton
                requestId={r.id}
                nextStatus={nextStatus[r.status]}
                label={nextLabel[r.status]}
                isDone={r.status === 'done'}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
