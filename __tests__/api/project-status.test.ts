import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/project-status/route'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
  })),
}))

const mockAdminUpdate = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockAdminUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
  })),
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/project-status', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const adminUser = { id: 'admin-1', app_metadata: { role: 'admin' } }
const clientUser = { id: 'client-1', app_metadata: { role: 'client' } }

describe('PATCH /api/project-status', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(makeRequest({ clientId: 'x' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: clientUser } })
    const res = await PATCH(makeRequest({ clientId: 'x' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when clientId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } })
    const res = await PATCH(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid project_status', async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } })
    const res = await PATCH(makeRequest({ clientId: 'x', project_status: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid stage', async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } })
    const res = await PATCH(makeRequest({ clientId: 'x', stage: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('updates project_status successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } })
    const res = await PATCH(makeRequest({ clientId: 'c-1', project_status: 'en_desarrollo' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('updates stage successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } })
    const res = await PATCH(makeRequest({ clientId: 'c-1', stage: 'production' }))
    expect(res.status).toBe(200)
  })
})
