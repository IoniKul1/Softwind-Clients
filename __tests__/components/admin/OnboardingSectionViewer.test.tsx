// __tests__/components/admin/OnboardingSectionViewer.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OnboardingSectionViewer from '@/components/admin/OnboardingSectionViewer'
import type { OnboardingData } from '@/lib/types'

describe('OnboardingSectionViewer', () => {
  describe('brand', () => {
    it('renders image preview and download link for logo_url', () => {
      const data: OnboardingData['brand'] = { logo_url: 'https://cdn.example.com/logo.png' }
      render(<OnboardingSectionViewer sectionKey="brand" data={data} />)
      const img = screen.getByRole('img', { name: /logo/i })
      expect(img).toBeTruthy()
      const link = screen.getByRole('link', { name: /descargar logo/i })
      expect(link.getAttribute('href')).toBe('https://cdn.example.com/logo.png')
    })

    it('renders brand guide download link without image preview', () => {
      const data: OnboardingData['brand'] = { brand_guide_url: 'https://cdn.example.com/guide.pdf' }
      render(<OnboardingSectionViewer sectionKey="brand" data={data} />)
      const link = screen.getByRole('link', { name: /descargar guía/i })
      expect(link.getAttribute('href')).toBe('https://cdn.example.com/guide.pdf')
    })

    it('renders nothing when all fields are empty', () => {
      const data: OnboardingData['brand'] = {}
      const { container } = render(<OnboardingSectionViewer sectionKey="brand" data={data} />)
      expect(container.querySelector('a')).toBeNull()
      expect(container.querySelector('img')).toBeNull()
    })
  })

  describe('typography', () => {
    it('renders display font name and file download', () => {
      const data: OnboardingData['typography'] = {
        display_name: 'Playfair Display',
        display_file_url: 'https://cdn.example.com/playfair.ttf',
        body_name: 'Inter',
      }
      render(<OnboardingSectionViewer sectionKey="typography" data={data} />)
      expect(screen.getByText('Playfair Display')).toBeTruthy()
      expect(screen.getByText('Inter')).toBeTruthy()
      const link = screen.getByRole('link', { name: /descargar archivo/i })
      expect(link.getAttribute('href')).toBe('https://cdn.example.com/playfair.ttf')
    })

    it('renders Google Fonts link as external link', () => {
      const data: OnboardingData['typography'] = {
        body_name: 'Inter',
        body_google_url: 'https://fonts.google.com/specimen/Inter',
      }
      render(<OnboardingSectionViewer sectionKey="typography" data={data} />)
      const link = screen.getByRole('link', { name: /ver en google fonts/i })
      expect(link.getAttribute('href')).toBe('https://fonts.google.com/specimen/Inter')
      expect(link.getAttribute('target')).toBe('_blank')
    })
  })

  describe('colors', () => {
    it('renders color name and hex for each color', () => {
      const data: OnboardingData['colors'] = [
        { name: 'Azul principal', hex: '#3B5BF6' },
        { name: 'Negro', hex: '#0A0A0A' },
      ]
      render(<OnboardingSectionViewer sectionKey="colors" data={data} />)
      expect(screen.getByText('Azul principal')).toBeTruthy()
      expect(screen.getByText('#3B5BF6')).toBeTruthy()
      expect(screen.getByText('Negro')).toBeTruthy()
      expect(screen.getByText('#0A0A0A')).toBeTruthy()
    })
  })

  describe('references', () => {
    it('renders image thumbnail and download link when image_url present', () => {
      const data: OnboardingData['references'] = [
        { image_url: 'https://cdn.example.com/ref.jpg', note: 'mood board' },
      ]
      render(<OnboardingSectionViewer sectionKey="references" data={data} />)
      expect(screen.getByRole('img')).toBeTruthy()
      expect(screen.getByRole('link', { name: /descargar/i })).toBeTruthy()
      expect(screen.getByText('mood board')).toBeTruthy()
    })

    it('renders external link when only url present', () => {
      const data: OnboardingData['references'] = [
        { url: 'https://dribbble.com/shot/123' },
      ]
      render(<OnboardingSectionViewer sectionKey="references" data={data} />)
      const link = screen.getByRole('link', { name: /dribbble/i })
      expect(link.getAttribute('href')).toBe('https://dribbble.com/shot/123')
      expect(link.getAttribute('target')).toBe('_blank')
    })
  })

  describe('previous_site', () => {
    it('renders "Sin sitio web anterior" when na is true', () => {
      const data: OnboardingData['previous_site'] = { na: true }
      render(<OnboardingSectionViewer sectionKey="previous_site" data={data} />)
      expect(screen.getByText(/sin sitio web anterior/i)).toBeTruthy()
    })

    it('renders url and likes/dislikes when provided', () => {
      const data: OnboardingData['previous_site'] = {
        url: 'https://old.example.com',
        likes: 'El logo',
        dislikes: 'Los colores',
      }
      render(<OnboardingSectionViewer sectionKey="previous_site" data={data} />)
      const link = screen.getByRole('link', { name: /old\.example\.com/i })
      expect(link.getAttribute('href')).toBe('https://old.example.com')
      expect(screen.getByText('El logo')).toBeTruthy()
      expect(screen.getByText('Los colores')).toBeTruthy()
    })
  })

  describe('content', () => {
    it('renders file name and download link for each file', () => {
      const data: OnboardingData['content'] = {
        files: [{ url: 'https://cdn.example.com/copy.docx', name: 'copy.docx' }],
        notes: 'Usar el tono informal',
      }
      render(<OnboardingSectionViewer sectionKey="content" data={data} />)
      const link = screen.getByRole('link', { name: /descargar/i })
      expect(link.getAttribute('href')).toBe('https://cdn.example.com/copy.docx')
      expect(screen.getByText('copy.docx')).toBeTruthy()
      expect(screen.getByText('Usar el tono informal')).toBeTruthy()
    })
  })

  describe('business', () => {
    it('renders labeled fields for industry, audience, tone, competitors, social', () => {
      const data: OnboardingData['business'] = {
        industry: 'Tecnología',
        audience: 'Startups B2B',
        tone: 'Profesional y directo',
        competitors: ['Notion', 'Linear'],
        social: { Instagram: '@softwind', LinkedIn: 'https://linkedin.com/company/softwind' },
      }
      render(<OnboardingSectionViewer sectionKey="business" data={data} />)
      expect(screen.getByText('Tecnología')).toBeTruthy()
      expect(screen.getByText('Startups B2B')).toBeTruthy()
      expect(screen.getByText('Profesional y directo')).toBeTruthy()
      expect(screen.getByText('Notion')).toBeTruthy()
      expect(screen.getByText('Linear')).toBeTruthy()
      expect(screen.getByText('@softwind')).toBeTruthy()
    })
  })
})
