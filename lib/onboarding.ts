// lib/onboarding.ts
import type { OnboardingData } from '@/lib/types'

export const ONBOARDING_SECTIONS: Array<{ key: keyof OnboardingData; label: string }> = [
  { key: 'brand', label: 'Identidad de Marca' },
  { key: 'typography', label: 'Tipografías' },
  { key: 'colors', label: 'Paleta de Colores' },
  { key: 'references', label: 'Referencias Visuales' },
  { key: 'previous_site', label: 'Sitio Web Anterior' },
  { key: 'content', label: 'Contenido y Copy' },
  { key: 'business', label: 'Info del Negocio' },
]

export function isSectionComplete(data: OnboardingData, key: keyof OnboardingData): boolean {
  const section = data[key]
  if (section === undefined || section === null) return false

  if (key === 'colors' || key === 'references') {
    return (section as unknown[]).length > 0
  }

  if (key === 'previous_site') {
    const ps = section as { na?: boolean; url?: string }
    return ps.na === true || (!!ps.url && ps.url.trim() !== '')
  }

  // For object sections: at least one non-empty value
  const values = Object.values(section as Record<string, unknown>)
  return values.some(v => v !== undefined && v !== null && v !== '')
}
