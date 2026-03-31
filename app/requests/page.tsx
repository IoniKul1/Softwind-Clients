import { createClient } from '@/lib/supabase/server'
import NewRequestForm from './NewRequestForm'
import AttachmentPreview from '@/components/AttachmentPreview'

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

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: requests } = await supabase
    .from('change_requests')
    .select('id, title, description, status, attachments, created_at')
    .eq('client_user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold mb-1">Pedidos de cambios</h1>
          <p className="text-neutral-500 text-sm">Enviá solicitudes de cambios para tu sitio web.</p>
        </div>
      </div>

      <NewRequestForm userId={user!.id} />

      <div className="flex flex-col gap-3 mt-8">
        {!requests?.length && (
          <p className="text-neutral-600 text-sm">No hay pedidos todavía.</p>
        )}
        {requests?.map((r) => (
          <div key={r.id} className="border border-neutral-800 rounded-xl px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <p className="font-medium text-sm">{r.title}</p>
              <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${statusColor[r.status]}`}>
                {statusLabel[r.status]}
              </span>
            </div>
            {r.description && (
              <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed">{r.description}</p>
            )}
            <AttachmentPreview attachments={r.attachments ?? []} />
            <p className="text-neutral-700 text-xs mt-2">
              {new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
