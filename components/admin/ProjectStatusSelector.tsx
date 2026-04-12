'use client'
import { useState, useEffect } from 'react'
import type { ProjectStatus, ProjectStage } from '@/lib/types'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pago_recibido: 'Pago recibido',
  en_desarrollo: 'En desarrollo',
  esperando_feedback: 'Esperando feedback',
  entregado: 'Entregado (legacy)',
  entregado_sin_mantenimiento: 'Listo sin mantenimiento',
  entregado_con_mantenimiento: 'Listo con mantenimiento',
}

const SELECTABLE_STATUSES: ProjectStatus[] = [
  'pago_recibido',
  'en_desarrollo',
  'esperando_feedback',
  'entregado_sin_mantenimiento',
]

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
  const [pendingDelivery, setPendingDelivery] = useState(false)

  useEffect(() => { setStatus(currentStatus) }, [currentStatus])
  useEffect(() => { setStage(currentStage) }, [currentStage])

  async function applyStatus(newStatus: ProjectStatus, newStage: ProjectStage) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/project-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, project_status: newStatus, stage: newStage }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      setStatus(newStatus)
      setStage(newStage)
      onUpdate(newStatus, newStage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
      setPendingDelivery(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as ProjectStatus
    if (newStatus === 'entregado_sin_mantenimiento') {
      setPendingDelivery(true)
    } else {
      setPendingDelivery(false)
      applyStatus(newStatus, stage)
    }
  }

  const selectValue = pendingDelivery ? 'entregado_sin_mantenimiento' : status

  const options = (() => {
    const base = [...SELECTABLE_STATUSES]
    if (status === 'entregado') base.push('entregado')
    if (status === 'entregado_con_mantenimiento') base.push('entregado_con_mantenimiento')
    return base
  })()

  return (
    <div>
      <label className="block text-xs text-neutral-400 mb-2">Estado del proyecto</label>
      <select
        value={selectValue}
        onChange={handleChange}
        disabled={saving}
        className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
      >
        {options.map(s => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      {saving && <p className="text-xs text-neutral-500 mt-1">Guardando...</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      {pendingDelivery && (
        <div className="mt-4 p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
          <p className="text-sm text-amber-300 font-medium mb-1">Elegir tipo de entrega</p>
          <p className="text-xs text-amber-400 mb-4">
            El cliente pasará a <strong>Producción</strong>. Elegí qué acceso tendrá.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => applyStatus('entregado_sin_mantenimiento', 'production')}
              disabled={saving}
              aria-label="Sin mantenimiento"
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-medium rounded-lg transition text-left disabled:opacity-50"
            >
              <span className="block font-semibold mb-0.5">Sin mantenimiento</span>
              <span className="text-neutral-400">El cliente ve la pantalla de "¡Listo!" únicamente.</span>
            </button>
            <button
              onClick={() => applyStatus('entregado_con_mantenimiento', 'production')}
              disabled={saving}
              aria-label="Con mantenimiento"
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition text-left disabled:opacity-50"
            >
              <span className="block font-semibold mb-0.5">Con mantenimiento</span>
              <span className="text-indigo-300">Acceso completo: CMS, Analytics, Pedidos y Onboarding.</span>
            </button>
            <button
              type="button"
              onClick={() => { setPendingDelivery(false); setError(null) }}
              className="text-xs text-neutral-500 hover:text-neutral-300 mt-1 transition text-left"
              aria-label="Cancelar entrega"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
