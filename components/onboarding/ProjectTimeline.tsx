// components/onboarding/ProjectTimeline.tsx
import type { ProjectStatus } from '@/lib/types'

const STEPS: { key: ProjectStatus; label: string; description?: string }[] = [
  { key: 'pago_recibido', label: 'Pago recibido' },
  { key: 'en_desarrollo', label: 'En desarrollo', description: 'Estamos trabajando en tu sitio ✨' },
  { key: 'esperando_feedback', label: 'Esperando tu feedback', description: 'Revisá el avance y contanos qué ajustar' },
  { key: 'entregado', label: 'Entregado y publicado', description: 'Acceso al plan de mantenimiento 🚀' },
]

interface Props {
  status: ProjectStatus
}

export default function ProjectTimeline({ status }: Props) {
  const activeIndex = STEPS.findIndex(s => s.key === status)

  return (
    <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
      <h2 className="text-sm font-semibold text-white mb-6">Estado del Proyecto</h2>
      <div className="flex flex-col">
        {STEPS.map((step, i) => {
          const isDone = activeIndex > i
          const isActive = activeIndex === i
          return (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isDone
                    ? 'bg-green-500'
                    : isActive
                    ? 'bg-indigo-500 ring-4 ring-indigo-500/20'
                    : 'bg-neutral-800 border border-neutral-700'
                }`}>
                  {isDone ? (
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-600'}`}>
                      {i + 1}
                    </span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-0.5 h-10 mt-1 ${isDone ? 'bg-green-500' : 'bg-neutral-800'}`} />
                )}
              </div>
              <div className="pb-8 pt-1">
                <p className={`text-sm font-medium ${
                  isDone ? 'text-neutral-500' : isActive ? 'text-white' : 'text-neutral-600'
                }`}>
                  {step.label}
                </p>
                {step.description && isActive && (
                  <p className="text-xs text-neutral-500 mt-0.5">{step.description}</p>
                )}
                {step.key === 'esperando_feedback' && isActive && (
                  <p className="text-[11px] text-indigo-400 mt-1.5">
                    <span aria-hidden="true">⇄</span> Vuelve a desarrollo si hay ajustes
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
