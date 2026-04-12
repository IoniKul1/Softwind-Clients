'use client'
import { useState } from 'react'
import type { ProjectStatus, ProjectStage } from '@/lib/types'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pago_recibido: 'Pago recibido',
  en_desarrollo: 'En desarrollo',
  esperando_feedback: 'Esperando feedback',
  entregado: 'Entregado y publicado',
}

const ALL_STATUSES: ProjectStatus[] = ['pago_recibido', 'en_desarrollo', 'esperando_feedback', 'entregado']

interface Props {
  clientId: string
  currentStatus: ProjectStatus
  currentStage: ProjectStage
  onUpdate: (status: ProjectStatus, stage: ProjectStage) => void
}

export default function ProjectStatusSelector({ clientId, currentStatus, currentStage, onUpdate }: Props) {
  const [status, setStatus] = useState<ProjectStatus>(currentStatus)
  const [stage, setStage] = useState<ProjectStage>(currentStage)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null)

  async function applyStatus(newStatus: ProjectStatus, newStage: ProjectStage) {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { clientId, project_status: newStatus }
      if (newStage !== stage) body.stage = newStage
      const res = await fetch('/api/project-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      setStatus(newStatus)
      setStage(newStage)
      onUpdate(newStatus, newStage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
      setPendingStatus(null)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as ProjectStatus
    if (newStatus === 'entregado') {
      // Require confirmation before transitioning to production
      setPendingStatus(newStatus)
    } else {
      applyStatus(newStatus, 'development')
    }
  }

  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-2">Estado del proyecto</label>
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
      >
        {ALL_STATUSES.map(s => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      {saving && <p className="text-xs text-neutral-500 mt-1">Guardando...</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      {/* Confirmation dialog for entregado */}
      {pendingStatus === 'entregado' && (
        <div className="mt-4 p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
          <p className="text-sm text-amber-300 font-medium mb-2">
            Marcar como entregado y pasar a Producción
          </p>
          <p className="text-xs text-amber-400 mb-4">
            Esto cambiará la etapa del cliente a <strong>Producción</strong>.
            El cliente perderá acceso al panel de onboarding y verá el CMS, analytics y pedidos de cambios.
            ¿Confirmás?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => applyStatus('entregado', 'production')}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition"
            >
              Sí, confirmar entrega
            </button>
            <button
              onClick={() => setPendingStatus(null)}
              className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
