import { describe, it, expect } from 'vitest'
import { computeSidebarMode } from '@/lib/sidebar'

describe('computeSidebarMode', () => {
  it('returns dev_incomplete for development stage with incomplete onboarding', () => {
    expect(computeSidebarMode('development', false)).toBe('dev_incomplete')
  })

  it('returns dev_complete for development stage with complete onboarding', () => {
    expect(computeSidebarMode('development', true)).toBe('dev_complete')
  })

  it('returns production_full for production stage regardless of onboarding', () => {
    expect(computeSidebarMode('production', false)).toBe('production_full')
    expect(computeSidebarMode('production', true)).toBe('production_full')
  })

  it('defaults to dev_incomplete for unknown stage', () => {
    expect(computeSidebarMode('unknown', false)).toBe('dev_incomplete')
  })
})
