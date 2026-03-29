import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks must be created in the factory function passed to vi.mock
vi.mock('framer-api', () => {
  const mockDisconnect = vi.fn()
  const mockPublish = vi.fn().mockResolvedValue({ deployment: { id: 'dep-1' } })
  const mockDeploy = vi.fn().mockResolvedValue({ hostnames: ['https://mysite.framer.website'] })
  const mockAddItems = vi.fn()
  const mockGetItems = vi.fn().mockResolvedValue([
    { id: 'item-1', slug: 'hello', fieldData: { 'field-1': { type: 'string', value: 'Hello' } } },
  ])
  const mockGetFields = vi.fn().mockResolvedValue([
    { id: 'field-1', name: 'Title', type: 'string' },
  ])
  const mockGetCollections = vi.fn().mockResolvedValue([
    { id: 'col-1', name: 'Blog', getFields: mockGetFields, getItems: mockGetItems, addItems: mockAddItems },
  ])

  // Store mocks in a global for test access
  ;(globalThis as any).__framer_mocks__ = {
    mockDisconnect,
    mockPublish,
    mockDeploy,
    mockAddItems,
    mockGetItems,
    mockGetFields,
    mockGetCollections,
  }

  return {
    connect: vi.fn().mockResolvedValue({
      getCollections: mockGetCollections,
      publish: mockPublish,
      deploy: mockDeploy,
      disconnect: mockDisconnect,
    }),
  }
})

import { getCollections, getCollectionFields, getItems, updateItemAndPublish } from '@/lib/framer'

const getMocks = () => (globalThis as any).__framer_mocks__

beforeEach(() => {
  const mocks = getMocks()
  vi.clearAllMocks()
  mocks.mockDisconnect.mockClear()
  mocks.mockPublish.mockClear()
  mocks.mockDeploy.mockClear()
  mocks.mockAddItems.mockClear()
  mocks.mockGetItems.mockClear()
  mocks.mockGetFields.mockClear()
  mocks.mockGetCollections.mockClear()
})

describe('framer lib', () => {
  it('getCollections returns id and name', async () => {
    const cols = await getCollections('https://framer.com/projects/x', 'key')
    expect(cols).toEqual([{ id: 'col-1', name: 'Blog' }])
    expect(getMocks().mockDisconnect).toHaveBeenCalled()
  })

  it('getCollectionFields returns field definitions', async () => {
    const fields = await getCollectionFields('https://framer.com/projects/x', 'key', 'col-1')
    expect(fields[0]).toMatchObject({ id: 'field-1', name: 'Title', type: 'string' })
  })

  it('getItems returns items', async () => {
    const items = await getItems('https://framer.com/projects/x', 'key', 'col-1')
    expect(items[0].id).toBe('item-1')
  })

  it('updateItemAndPublish calls addItems, publish, deploy', async () => {
    await updateItemAndPublish('https://framer.com/projects/x', 'key', 'col-1', {
      id: 'item-1',
      slug: 'hello',
      fieldData: { 'field-1': { type: 'string', value: 'Updated' } },
    })
    const mocks = getMocks()
    expect(mocks.mockAddItems).toHaveBeenCalledWith([expect.objectContaining({ id: 'item-1' })])
    expect(mocks.mockPublish).toHaveBeenCalled()
    expect(mocks.mockDeploy).toHaveBeenCalledWith('dep-1')
    expect(mocks.mockDisconnect).toHaveBeenCalled()
  })
})
