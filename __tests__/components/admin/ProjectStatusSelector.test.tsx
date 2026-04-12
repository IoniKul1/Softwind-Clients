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
    expect(screen.getByText('Listo sin mantenimiento')).toBeTruthy()
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

  it('shows delivery dialog before switching to entregado_sin_mantenimiento', () => {
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="esperando_feedback"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'entregado_sin_mantenimiento' } })
    expect(screen.getByText(/Elegir tipo de entrega/i)).toBeTruthy()
  })

  it('shows two delivery buttons when entregado_sin_mantenimiento selected', async () => {
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="en_desarrollo"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'entregado_sin_mantenimiento' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sin mantenimiento/i })).toBeTruthy()
      expect(screen.getByRole('button', { name: /con mantenimiento/i })).toBeTruthy()
    })
  })

  it('calls fetch with entregado_sin_mantenimiento and production stage on confirm', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="en_desarrollo"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'entregado_sin_mantenimiento' } })
    await waitFor(() => screen.getByRole('button', { name: /sin mantenimiento/i }))
    fireEvent.click(screen.getByRole('button', { name: /sin mantenimiento/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/project-status', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ clientId: 'c-1', project_status: 'entregado_sin_mantenimiento', stage: 'production' }),
      }))
    })
  })

  it('calls fetch with entregado_con_mantenimiento and production stage on confirm', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    render(
      <ProjectStatusSelector
        clientId="c-1"
        currentStatus="en_desarrollo"
        currentStage="development"
        onUpdate={vi.fn()}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'entregado_sin_mantenimiento' } })
    await waitFor(() => screen.getByRole('button', { name: /con mantenimiento/i }))
    fireEvent.click(screen.getByRole('button', { name: /con mantenimiento/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/project-status', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ clientId: 'c-1', project_status: 'entregado_con_mantenimiento', stage: 'production' }),
      }))
    })
  })
})
