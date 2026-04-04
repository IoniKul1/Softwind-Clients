'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Plan = 'basic' | 'growth' | 'ultimate'

const PLANS: { value: Plan; label: string; minutes: number }[] = [
  { value: 'basic',    label: 'Basic',    minutes: 300  },
  { value: 'growth',   label: 'Growth',   minutes: 600  },
  { value: 'ultimate', label: 'Ultimate', minutes: 1200 },
]

export default function PlanUsage({
  clientId,
  currentPlan,
  usedMinutes,
}: {
  clientId: string
  currentPlan: Plan | null
  usedMinutes: number
}) {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan | null>(currentPlan)
  const [saving, setSaving] = useState(false)

  const planData = PLANS.find(p => p.value === plan)
  const pct = planData ? Math.min(100, Math.round((usedMinutes / planData.minutes) * 100)) : null

  const barColor =
    pct === null ? '' :
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-yellow-400' :
    'bg-brand'

  async function handlePlanChange(newPlan: Plan | null) {
    setPlan(newPlan)
    setSaving(true)
    await fetch(`/api/admin/clients/${clientId}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: newPlan }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="border border-neutral-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium">Plan del cliente</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {usedMinutes} min usados
            {planData ? ` de ${planData.minutes} min (${Math.floor(planData.minutes / 60)}h)` : ''}
            {saving && <span className="ml-2 text-neutral-600">Guardando...</span>}
          </p>
        </div>

        {/* Plan selector */}
        <div className="flex gap-1.5">
          {PLANS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePlanChange(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                plan === p.value
                  ? 'bg-brand text-white border-brand'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
              }`}
            >
              {p.label}
            </button>
          ))}
          {plan && (
            <button
              type="button"
              onClick={() => handlePlanChange(null)}
              className="px-2 py-1.5 rounded-lg text-xs text-neutral-600 hover:text-neutral-400 transition"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {planData && pct !== null && (
        <div>
          <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
            <span>{pct}% usado</span>
            <span>{planData.minutes - usedMinutes} min restantes</span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {!plan && (
        <p className="text-xs text-neutral-600">Seleccioná un plan para ver el uso.</p>
      )}
    </div>
  )
}
