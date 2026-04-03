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

type Status = 'pending' | 'in_progress' | 'qa' | 'done'
type Assignee = 'Martin' | 'Santiago' | 'Yoni' | null

const TEAM: { name: string; initials: string; color: string }[] = [
  { name: 'Martin',   initials: 'M', color: 'bg-violet-600' },
  { name: 'Santiago', initials: 'S', color: 'bg-orange-500' },
  { name: 'Yoni',     initials: 'Y', color: 'bg-brand' },
]

interface Request {
  id: string
  client_user_id: string
  title: string
  description: string | null
  status: Status
  assigned_to: Assignee
  attachments: { url: string; name: string; type: 'image' | 'file' }[]
  created_at: string
}

const statusLabel: Record<Status, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  qa: 'QA',
  done: 'Listo',
}
const statusColor: Record<Status, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  in_progress: 'text-brand bg-brand/10 border-brand/20',
  qa: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  done: 'text-green-400 bg-green-400/10 border-green-400/20',
}
const colLabel: Record<Status, string> = {
  pending: 'Pendientes',
  in_progress: 'En curso',
  qa: 'QA',
  done: 'Listos',
}
const accent: Record<Status, string> = {
  pending: 'bg-yellow-400',
  in_progress: 'bg-brand',
  qa: 'bg-purple-500',
  done: 'bg-green-500',
}
const cols: Status[] = ['pending', 'in_progress', 'qa', 'done']

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const member = TEAM.find(t => t.name === name)
  if (!member) return null
  const dim = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-xs'
  return (
    <span className={`${dim} ${member.color} rounded-full flex items-center justify-center text-white font-medium shrink-0`}>
      {member.initials}
    </span>
  )
}

function RequestCard({ r, profileMap, projectMap, isDragging = false }: {
  r: Request
  profileMap: Record<string, string>
  projectMap: Record<string, string>
  isDragging?: boolean
}) {
  return (
    <div className={`border border-neutral-800 rounded-xl px-4 py-3.5 bg-neutral-950 select-none ${isDragging ? 'opacity-40' : 'hover:border-neutral-700 transition-colors'}`}>
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <p className="font-medium text-sm leading-snug">{r.title}</p>
        {r.assigned_to && <Avatar name={r.assigned_to} />}
      </div>
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

function DraggableCard({ r, profileMap, projectMap, onOpen, locked }: {
  r: Request
  profileMap: Record<string, string>
  projectMap: Record<string, string>
  onOpen: (r: Request) => void
  locked: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: r.id, disabled: locked })
  return (
    <div
      ref={setNodeRef}
      {...(locked ? {} : listeners)}
      {...(locked ? {} : attributes)}
      className={locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
      onClick={() => { if (!isDragging) onOpen(r) }}
    >
      <RequestCard r={r} profileMap={profileMap} projectMap={projectMap} isDragging={isDragging} />
    </div>
  )
}

function Column({ status, requests, profileMap, projectMap, onOpen, locked }: {
  status: Status
  requests: Request[]
  profileMap: Record<string, string>
  projectMap: Record<string, string>
  onOpen: (r: Request) => void
  locked: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: locked })
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
          <DraggableCard key={r.id} r={r} profileMap={profileMap} projectMap={projectMap} onOpen={onOpen} locked={locked} />
        ))}
      </div>
    </div>
  )
}

function DetailPanel({ r, profileMap, projectMap, onClose, onUpdate }: {
  r: Request
  profileMap: Record<string, string>
  projectMap: Record<string, string>
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Request>) => void
}) {
  const [savingAssignee, setSavingAssignee] = useState(false)

  async function handleAssign(name: string | null) {
    const assigned_to = name as Assignee
    setSavingAssignee(true)
    onUpdate(r.id, { assigned_to })
    await fetch(`/api/admin/requests/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to }),
    })
    setSavingAssignee(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] z-50 bg-neutral-950 border-l border-neutral-800 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusColor[r.status]}`}>
            {statusLabel[r.status]}
          </span>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition text-xl leading-none">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold leading-snug mb-1">{r.title}</h2>
            <p className="text-xs text-neutral-600">
              {projectMap[r.client_user_id] ?? '—'}
              {profileMap[r.client_user_id] && (
                <span className="text-neutral-700"> · {profileMap[r.client_user_id]}</span>
              )}
            </p>
          </div>

          {/* Assignee */}
          <div>
            <p className="text-xs text-neutral-500 mb-3">Asignado a</p>
            <div className="flex items-center gap-2">
              {TEAM.map(member => {
                const isSelected = r.assigned_to === member.name
                return (
                  <button
                    key={member.name}
                    onClick={() => handleAssign(isSelected ? null : member.name)}
                    disabled={savingAssignee}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition ${
                      isSelected
                        ? 'border-white/20 bg-white/10 text-white'
                        : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'
                    }`}
                  >
                    <Avatar name={member.name} size="sm" />
                    {member.name}
                  </button>
                )
              })}
            </div>
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
  notionUrl,
}: {
  initialRequests: Request[]
  profileMap: Record<string, string>
  projectMap: Record<string, string>
  notionUrl: string | null
}) {
  const [requests, setRequests] = useState(initialRequests)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [locked, setLocked] = useState(true)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const activeRequest = requests.find(r => r.id === activeId) ?? null
  const selected = requests.find(r => r.id === selectedId) ?? null

  function patchRequest(id: string, patch: Partial<Request>) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    setSelectedId(null)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const newStatus = over.id as Status
    const req = requests.find(r => r.id === active.id)
    if (!req || req.status === newStatus) return

    patchRequest(active.id as string, { status: newStatus })
    fetch(`/api/admin/requests/${active.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  const byStatus = (s: Status) => requests.filter(r => r.status === s)

  return (
    <>
      {/* Lock bar */}
      <div className="flex items-center gap-3 mb-6 px-3.5 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900/50">
        <button
          onClick={() => setLocked(l => !l)}
          className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-lg border transition ${
            locked
              ? 'border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
              : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:border-yellow-500/60'
          }`}
        >
          {locked ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
            </svg>
          )}
          {locked ? 'Edición bloqueada' : 'Edición activa'}
        </button>
        <p className="text-xs text-neutral-600">
          {locked
            ? 'La buena práctica es gestionar los estados desde Notion.'
            : 'Los cambios acá no se sincronizan a Notion.'}
        </p>
        {notionUrl && (
          <a
            href={notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-neutral-500 hover:text-neutral-300 transition shrink-0"
          >
            Abrir Notion →
          </a>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {cols.map(s => (
            <Column
              key={s}
              status={s}
              requests={byStatus(s)}
              profileMap={profileMap}
              projectMap={projectMap}
              onOpen={r => setSelectedId(r.id)}
              locked={locked}
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
          onClose={() => setSelectedId(null)}
          onUpdate={patchRequest}
        />
      )}
    </>
  )
}
