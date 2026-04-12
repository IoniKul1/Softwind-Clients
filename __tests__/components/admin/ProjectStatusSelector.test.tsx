// __tests__/components/admin/ProjectStatusSelector.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProjectStatusSelector from '@/components/admin/ProjectStatusSelector'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ProjectStatusSelector', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders current status label', () => {
    const onUpdate = vi.fn()
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="en_desarrollo"
        currentStage="development"
        onUpdate={onUpdate}
      />
    )
    expect(screen.getByText('En desarrollo')).toBeTruthy()
  })

  it('renders all status options', () => {
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="pago_recibido"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    expect(screen.getByText('Pago recibido')).toBeTruthy()
    expect(screen.getByText('En desarrollo')).toBeTruthy()
    expect(screen.getByText('Esperando feedback')).toBeTruthy()
    expect(screen.getByText('Entregado y publicado')).toBeTruthy()
  })

  it('calls fetch on status change', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const onUpdate = vi.fn()
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="pago_recibido"
        currentStage="development"
        onUpdate={onUpdate}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'en_desarrollo' } })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      '/api/project-status',
      expect.objectContaining({ method: 'PATCH' })
    ))
  })

  it('shows confirmation dialog before switching to entregado', () => {
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="esperando_feedback"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'entregado' } })
    expect(screen.getByText(/Marcar como entregado/i)).toBeTruthy()
  })
})
