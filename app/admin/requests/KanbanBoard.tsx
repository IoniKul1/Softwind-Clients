'use client'
import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
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

function RequestCard({ r, profileMap, projectMap, isDragging = false }: {
  r: Request
  profileMap: Record<string, string>
  projectMap: Record<string, string>
  isDragging?: boolean
}) {
  return (
    <div className={`border border-neutral-800 rounded-xl px-4 py-3.5 bg-neutral-950 ${isDragging ? 'opacity-50' : ''}`}>
      <p className="font-medium text-sm mb-0.5">{r.title}</p>
      <p className="text-[11px] text-neutral-600">
        {projectMap[r.client_user_id] ?? profileMap[r.client_user_id] ?? '—'}
        {profileMap[r.client_user_id] && projectMap[r.client_user_id] && (
          <span className="text-neutral-700"> · {profileMap[r.client_user_id]}</span>
        )}
      </p>
      {r.description && (
        <p className="text-neutral-500 text-xs leading-relaxed mt-2">{r.description}</p>
      )}
      <AttachmentPreview attachments={r.attachments ?? []} />
      <p className="text-neutral-700 text-xs mt-2">
        {new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
      </p>
    </div>
  )
}

function DraggableCard({ r, profileMap, projectMap }: {
  r: Request
  profileMap: Record<string, string>
  projectMap: Record<string, string>
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: r.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <RequestCard r={r} profileMap={profileMap} projectMap={projectMap} isDragging={isDragging} />
    </div>
  )
}

function Column({ status, requests, profileMap, projectMap }: {
  status: Status
  requests: Request[]
  profileMap: Record<string, string>
  projectMap: Record<string, string>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${accent[status]}`} />
        <h2 className="text-sm font-medium">{statusLabel[status]}</h2>
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
          <DraggableCard key={r.id} r={r} profileMap={profileMap} projectMap={projectMap} />
        ))}
      </div>
    </div>
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const activeRequest = requests.find(r => r.id === activeId) ?? null

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
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
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-3 gap-6">
        {cols.map(s => (
          <Column key={s} status={s} requests={byStatus(s)} profileMap={profileMap} projectMap={projectMap} />
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
  )
}
