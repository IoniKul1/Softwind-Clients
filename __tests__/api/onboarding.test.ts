import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/onboarding/route'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
  })),
}))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
  })),
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/onboarding', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('PATCH /api/onboarding', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(makeRequest({ section: 'brand', data: {} }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid section', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const res = await PATCH(makeRequest({ section: 'invalid', data: {} }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when section is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const res = await PATCH(makeRequest({ data: {} }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when project not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const res = await PATCH(makeRequest({ section: 'brand', data: { logo_url: 'https://x.com/logo.png' } }))
    expect(res.status).toBe(404)
  })

  it('returns 200, merges section data, and sets onboarding_complete false when not all sections done', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { id: 'proj-1', onboarding_data: {} }, error: null })
    const res = await PATCH(makeRequest({ section: 'brand', data: { logo_url: 'https://x.com/logo.png' } }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      onboarding_data: { brand: { logo_url: 'https://x.com/logo.png' } },
      onboarding_complete: false,
    }))
  })

  it('sets onboarding_complete true when all 7 sections are present and complete', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const existing = {
      brand: { logo_url: 'https://x.com/logo.png' },
      typography: { display_name: 'Playfair' },
      colors: [{ name: 'Azul', hex: '#3B5BF6' }],
      references: [{ url: 'https://example.com' }],
      previous_site: { na: true },
      content: { notes: 'some notes' },
    }
    mockSingle.mockResolvedValue({ data: { id: 'proj-1', onboarding_data: existing }, error: null })
    const businessData = { industry: 'Tech', audience: 'SMBs', tone: 'Formal' }
    const res = await PATCH(makeRequest({ section: 'business', data: businessData }))
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      onboarding_complete: true,
    }))
  })
})
