// components/onboarding/OnboardingChecklist.tsx
import Link from 'next/link'
import { ONBOARDING_SECTIONS, isSectionComplete } from '@/lib/onboarding'
import type { OnboardingData } from '@/lib/types'

interface Props {
  data: OnboardingData
}

export default function OnboardingChecklist({ data }: Props) {
  const completed = ONBOARDING_SECTIONS.filter(s => isSectionComplete(data, s.key)).length
  const total = ONBOARDING_SECTIONS.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white">Tu información</h2>
        <span className="text-xs text-neutral-500">{completed} de {total}</span>
      </div>
      <div className="h-1.5 bg-neutral-800 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-col gap-2">
        {ONBOARDING_SECTIONS.map(({ key, label }) => {
          const done = isSectionComplete(data, key)
          return (
            <Link
              key={key}
              href={`/onboarding/${key}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50 transition"
            >
              <span className={`text-sm ${done ? 'text-neutral-300' : 'text-neutral-500'}`}>
                {label}
              </span>
              <span className={`text-xs font-medium ${done ? 'text-green-400' : 'text-amber-500'}`}>
                {done ? '✓ Completo' : '⏳ Pendiente'}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
