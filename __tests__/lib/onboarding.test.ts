import { describe, it, expect } from 'vitest'
import { isSectionComplete, ONBOARDING_SECTIONS } from '@/lib/onboarding'
import type { OnboardingData } from '@/lib/types'

describe('isSectionComplete', () => {
  it('returns false when section is missing', () => {
    expect(isSectionComplete({}, 'brand')).toBe(false)
  })

  it('returns false when brand has no fields filled', () => {
    const data: OnboardingData = { brand: {} }
    expect(isSectionComplete(data, 'brand')).toBe(false)
  })

  it('returns true when brand has at least one field filled', () => {
    const data: OnboardingData = { brand: { logo_url: 'https://example.com/logo.png' } }
    expect(isSectionComplete(data, 'brand')).toBe(true)
  })

  it('returns false for empty colors array', () => {
    const data: OnboardingData = { colors: [] }
    expect(isSectionComplete(data, 'colors')).toBe(false)
  })

  it('returns true for non-empty colors array', () => {
    const data: OnboardingData = { colors: [{ name: 'Primario', hex: '#6366f1' }] }
    expect(isSectionComplete(data, 'colors')).toBe(true)
  })

  it('returns false for empty references array', () => {
    const data: OnboardingData = { references: [] }
    expect(isSectionComplete(data, 'references')).toBe(false)
  })

  it('returns true for non-empty references array', () => {
    const data: OnboardingData = { references: [{ url: 'https://example.com' }] }
    expect(isSectionComplete(data, 'references')).toBe(true)
  })

  it('returns true for previous_site marked as N/A', () => {
    const data: OnboardingData = { previous_site: { na: true } }
    expect(isSectionComplete(data, 'previous_site')).toBe(true)
  })

  it('returns true for previous_site with url', () => {
    const data: OnboardingData = { previous_site: { url: 'https://old-site.com' } }
    expect(isSectionComplete(data, 'previous_site')).toBe(true)
  })

  it('returns false for previous_site with no fields', () => {
    const data: OnboardingData = { previous_site: {} }
    expect(isSectionComplete(data, 'previous_site')).toBe(false)
  })

  it('ONBOARDING_SECTIONS has 7 entries', () => {
    expect(ONBOARDING_SECTIONS).toHaveLength(7)
  })
})
