// __tests__/components/admin/AdminOnboardingTab.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AdminOnboardingTab from '@/components/admin/AdminOnboardingTab'

const mockFetch = vi.fn()
global.fetch = mockFetch

const baseProject = {
  id: 'p-1',
  stage: 'development' as const,
  project_status: 'en_desarrollo' as const,
  onboarding_data: {
    brand: { logo_url: 'https://cdn.example.com/logo.png' },
    colors: [{ name: 'Azul', hex: '#3B5BF6' }],
  },
  admin_notes: '',
  meeting_file_url: undefined,
}

describe('AdminOnboardingTab — onboarding section display', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders brand logo as an image, not raw JSON', () => {
    render(<AdminOnboardingTab clientId="c-1" project={baseProject} />)
    const img = screen.getByRole('img', { name: /logo/i })
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/logo.png')
    expect(screen.queryByText(/"logo_url"/)).toBeNull()
  })

  it('renders color hex code as text, not raw JSON', () => {
    render(<AdminOnboardingTab clientId="c-1" project={baseProject} />)
    expect(screen.getByText('#3B5BF6')).toBeTruthy()
    expect(screen.queryByText(/"hex"/)).toBeNull()
  })
})
