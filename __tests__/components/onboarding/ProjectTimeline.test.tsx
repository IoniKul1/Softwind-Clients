// __tests__/components/onboarding/ProjectTimeline.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectTimeline from '@/components/onboarding/ProjectTimeline'

describe('ProjectTimeline', () => {
  it('renders all 4 step labels', () => {
    render(<ProjectTimeline status="pago_recibido" />)
    expect(screen.getByText('Pago recibido')).toBeTruthy()
    expect(screen.getByText('En desarrollo')).toBeTruthy()
    expect(screen.getByText('Esperando tu feedback')).toBeTruthy()
    expect(screen.getByText('Entregado y publicado')).toBeTruthy()
  })

  it('shows first step as active for pago_recibido', () => {
    const { container } = render(<ProjectTimeline status="pago_recibido" />)
    // Active step has indigo background
    expect(container.querySelector('.bg-indigo-500')).toBeTruthy()
  })

  it('shows completed steps with green background for en_desarrollo', () => {
    const { container } = render(<ProjectTimeline status="en_desarrollo" />)
    // First step (pago_recibido) should be done (green)
    expect(container.querySelector('.bg-green-500')).toBeTruthy()
  })

  it('renders cycle indicator for esperando_feedback when active', () => {
    render(<ProjectTimeline status="esperando_feedback" />)
    expect(screen.getByText(/Vuelve a desarrollo/)).toBeTruthy()
  })

  it('does not show cycle indicator when not on feedback step', () => {
    render(<ProjectTimeline status="en_desarrollo" />)
    expect(screen.queryByText(/Vuelve a desarrollo/)).toBeNull()
  })
})
