'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import AttachmentPreview from '@/components/AttachmentPreview'

type Status = 'pending' | 'in_progress' | 'done'

interface Request {
  id: string
  client_user_id: string
  title: string
  description: string | null
  status: Status
  attachments: { url: string; name: string; type: 'image' | 'file' }[]
  created_at: string
}

const statusLabel: Record<Status, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Listo',
}
const statusColor: Record<Status, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  in_progress: 'text-brand bg-brand/10 border-brand/20',
  done: 'text-green-400 bg-green-400/10 border-green-400/20',
}
const colLabel: Record<Status, string> = {
  pending: 'Pendientes',
  in_progress: 'En curso',
  done: 'Listos',
}
const accent: Record<Status, string> = {
  pending: 'bg-yellow-400',
  in_progress: 'bg-brand',
  done: 'bg-green-500',
}
const cols: Status[] = ['pending', 'in_progress', 'done']

function RequestCard({ r, profileMap, projectMap, isDragging = false, onClick }: {
  r: Request
  profileMap: Record<string, string>
  projectMap: Record<string, string>
  isDragging?: boolean
  onClick?: () => void
}) {
  return (
    <div
      className={`border border-neutral-800 rounded-xl px-4 py-3.5 bg-neutral-950 select-none ${isDragging ? 'opacity-40' : 'hover:border-neutral-700 transition-colors'}`}
      onClick={onClick}
    >
      <p className="font-medium text-sm mb-0.5 leading-snug">{r.title}</p>
      <p className="text-[11px] text-neutral-600">
        {projectMap[r.client_user_id] ?? profileMap[r.client_user_id] ?? '—'}
        {profileMap[r.client_user_id] && projectMap[r.client_user_id] && (
          <span className="text-neutral-700"> · {profileMap[r.client_user_id]}</span>
        )}
      </p>
      {r.attachments?.length > 0 && (
        <p className="text-[11px] text-neutral-700 mt-1.5">📎 {r.attachments.length} adjunto{r.attachments.length > 1 ? 's' : ''}</p>
      )}
      <p className="text-neutral-700 text-xs mt-2">
        {new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
      </p>
    </div>
  )
}

function DraggableCard({ r, profileMap, projectMap, onOpen }: {
  r: Request
  profileMap: Record<string, string>
  projectMap: Record<string, string>
  onOpen: (r: Request) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: r.id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
      onClick={() => { if (!isDragging) onOpen(r) }}
    >
      <RequestCard r={r} profileMap={profileMap} projectMap={projectMap} isDragging={isDragging} />
    </div>
  )
}

function Column({ status, requests, profileMap, projectMap, onOpen }: {
  status: Status
  requests: Request[]
  profileMap: Record<string, string>
  projectMap: Record<string, string>
  onOpen: (r: Request) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${accent[status]}`} />
        <h2 className="text-sm font-medium">{colLabel[status]}</h2>
        <span className="text-xs text-neutral-600 ml-auto">{requests.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-3 min-h-[120px] rounded-xl transition-colors p-1 -m-1 ${isOver ? 'bg-neutral-900' : ''}`}
      >
        {requests.length === 0 && !isOver && (
          <p className="text-neutral-700 text-xs px-1 pt-1">Sin pedidos</p>
        )}
        {requests.map(r => (
          <DraggableCard key={r.id} r={r} profileMap={profileMap} projectMap={projectMap} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}

function DetailPanel({ r, profileMap, projectMap, onClose }: {
  r: Request
  profileMap: Record<string, string>
  projectMap: Record<string, string>
  onClose: () => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] z-50 bg-neutral-950 border-l border-neutral-800 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusColor[r.status]}`}>
            {statusLabel[r.status]}
          </span>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition text-lg leading-none">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold leading-snug mb-1">{r.title}</h2>
            <p className="text-xs text-neutral-600">
              {projectMap[r.client_user_id] ?? '—'}
              {profileMap[r.client_user_id] && (
                <span className="text-neutral-700"> · {profileMap[r.client_user_id]}</span>
              )}
            </p>
          </div>

          {r.description && (
            <div>
              <p className="text-xs text-neutral-500 mb-1.5">Descripción</p>
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{r.description}</p>
            </div>
          )}

          {r.attachments?.length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-2">Adjuntos</p>
              <AttachmentPreview attachments={r.attachments} />
            </div>
          )}

          <div>
            <p className="text-xs text-neutral-500 mb-1">Fecha</p>
            <p className="text-sm text-neutral-300">
              {new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-neutral-800">
          <Link
            href={`/admin/clients/${r.client_user_id}/requests`}
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-neutral-700 hover:border-neutral-500 rounded-xl text-sm transition"
          >
            Ver todos los pedidos del cliente →
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.2s ease; }
      `}</style>
    </>
  )
}

export default function KanbanBoard({
  initialRequests,
  profileMap,
  projectMap,
}: {
  initialRequests: Request[]
  profileMap: Record<string, string>
  projectMap: Record<string, string>
}) {
  const [requests, setRequests] = useState(initialRequests)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Request | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const activeRequest = requests.find(r => r.id === activeId) ?? null

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    setSelected(null)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const newStatus = over.id as Status
    const req = requests.find(r => r.id === active.id)
    if (!req || req.status === newStatus) return

    setRequests(prev => prev.map(r => r.id === active.id ? { ...r, status: newStatus } : r))
    fetch(`/api/admin/requests/${active.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  const byStatus = (s: Status) => requests.filter(r => r.status === s)

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-3 gap-6">
          {cols.map(s => (
            <Column
              key={s}
              status={s}
              requests={byStatus(s)}
              profileMap={profileMap}
              projectMap={projectMap}
              onOpen={setSelected}
            />
          ))}
        </div>
        <DragOverlay>
          {activeRequest && (
            <div className="rotate-1 scale-105 shadow-2xl">
              <RequestCard r={activeRequest} profileMap={profileMap} projectMap={projectMap} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selected && (
        <DetailPanel
          r={selected}
          profileMap={profileMap}
          projectMap={projectMap}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
