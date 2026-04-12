// __tests__/components/onboarding/OnboardingChecklist.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist'
import type { OnboardingData } from '@/lib/types'

// next/link renders as <a> in tests
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}))

describe('OnboardingChecklist', () => {
  it('shows 0 of 7 when data is empty', () => {
    render(<OnboardingChecklist data={{}} />)
    expect(screen.getByText('0 de 7')).toBeTruthy()
  })

  it('shows all 7 section labels', () => {
    render(<OnboardingChecklist data={{}} />)
    expect(screen.getByText('Identidad de Marca')).toBeTruthy()
    expect(screen.getByText('Tipografías')).toBeTruthy()
    expect(screen.getByText('Paleta de Colores')).toBeTruthy()
    expect(screen.getByText('Referencias Visuales')).toBeTruthy()
    expect(screen.getByText('Sitio Web Anterior')).toBeTruthy()
    expect(screen.getByText('Contenido y Copy')).toBeTruthy()
    expect(screen.getByText('Info del Negocio')).toBeTruthy()
  })

  it('marks completed sections correctly', () => {
    const data: OnboardingData = {
      brand: { logo_url: 'https://x.com/logo.png' },
      colors: [{ name: 'Primario', hex: '#6366f1' }],
    }
    render(<OnboardingChecklist data={data} />)
    expect(screen.getByText('2 de 7')).toBeTruthy()
  })

  it('shows Completo for completed sections', () => {
    const data: OnboardingData = { brand: { logo_url: 'https://x.com/logo.png' } }
    render(<OnboardingChecklist data={data} />)
    expect(screen.getByText('✓ Completo')).toBeTruthy()
  })

  it('section links point to correct paths', () => {
    render(<OnboardingChecklist data={{}} />)
    const link = screen.getByRole('link', { name: /Identidad de Marca/ })
    expect(link.getAttribute('href')).toBe('/onboarding/brand')
  })
})
