import { createAdminClient } from '@/lib/supabase/admin'
import RequestStatusButton from '../clients/[id]/requests/RequestStatusButton'
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

export default async function AdminRequestsDashboard() {
  const adminClient = createAdminClient()

  const [{ data: requests }, { data: profiles }, { data: projects }] = await Promise.all([
    adminClient
      .from('change_requests')
      .select('id, client_user_id, title, description, status, attachments, created_at')
      .order('created_at', { ascending: false }),
    adminClient.from('profiles').select('id, name'),
    adminClient.from('projects').select('client_user_id, name'),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.name]))
  const projectMap = Object.fromEntries((projects ?? []).map(p => [p.client_user_id, p.name]))

  const pending = requests?.filter(r => r.status === 'pending') ?? []
  const in_progress = requests?.filter(r => r.status === 'in_progress') ?? []
  const done = requests?.filter(r => r.status === 'done') ?? []

  const Card = ({ r }: { r: (typeof requests)[number] }) => (
    <div className="border border-neutral-800 rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{r.title}</p>
          <p className="text-[11px] text-neutral-600 mt-0.5">
            {projectMap[r.client_user_id] ?? profileMap[r.client_user_id] ?? '—'}
            {profileMap[r.client_user_id] && projectMap[r.client_user_id] && (
              <span className="text-neutral-700"> · {profileMap[r.client_user_id]}</span>
            )}
          </p>
        </div>
        <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${statusColor[r.status]}`}>
          {statusLabel[r.status]}
        </span>
      </div>
      {r.description && (
        <p className="text-neutral-500 text-xs leading-relaxed mt-2">{r.description}</p>
      )}
      <AttachmentPreview attachments={r.attachments ?? []} />
      <div className="flex items-center justify-between mt-3">
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
  )

  const Column = ({ title, items, accent }: { title: string; items: typeof pending; accent: string }) => (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${accent}`} />
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-neutral-600 ml-auto">{items.length}</span>
      </div>
      {items.length === 0 && (
        <p className="text-neutral-700 text-xs px-1">Sin pedidos</p>
      )}
      {items.map(r => <Card key={r.id} r={r} />)}
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold mb-1">Pedidos de cambios</h1>
        <p className="text-neutral-500 text-sm">Todos los pedidos de todos los clientes.</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Column title="Pendientes" items={pending} accent="bg-yellow-400" />
        <Column title="En curso" items={in_progress} accent="bg-brand" />
        <Column title="Listos" items={done} accent="bg-green-500" />
      </div>
    </div>
  )
}
