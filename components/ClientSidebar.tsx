// components/ClientSidebar.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import type { ProjectStage } from '@/lib/types'

interface Props {
  name: string
  websiteUrl?: string | null
  stage: ProjectStage
}

export default function ClientSidebar({ name, websiteUrl, stage }: Props) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const domain = websiteUrl ? websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : null

  const navItem = (href: string, label: string, badge?: string) => {
    const active = pathname === href || (href !== '/collections' && href !== '/onboarding' && pathname.startsWith(href))
      || pathname === href
    return (
      <Link
        href={href}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
          active
            ? 'bg-neutral-800 text-white'
            : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
        }`}
      >
        <span className="flex-1">{label}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-400">{badge}</span>
        )}
      </Link>
    )
  }

  const sidebar = (
    <aside className={`
      fixed md:static inset-y-0 left-0 z-50
      w-64 md:w-56 shrink-0
      flex flex-col
      border-r border-neutral-800
      min-h-screen px-4 py-6
      bg-neutral-950
      transform transition-transform duration-200
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      <button
        className="md:hidden absolute top-4 right-4 text-neutral-500 hover:text-white text-xl leading-none"
        onClick={() => setIsOpen(false)}
      >
        ×
      </button>

      <div className="mb-8 px-1 flex items-center gap-2">
        <img src="/isologo.png" alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
        <span style={{ fontFamily: 'Cal Sans, sans-serif', fontSize: 16 }}>Softwind</span>
      </div>

      <div className="px-1 mb-6">
        <p className="text-xs font-medium text-white leading-tight truncate">{name}</p>
        {domain && (
          <a
            href={websiteUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 mt-1 group"
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stage === 'production' ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300 transition truncate">{domain}</span>
          </a>
        )}
        {stage === 'development' && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-400 border border-indigo-800">
            En desarrollo
          </span>
        )}
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {stage === 'development' ? (
          navItem('/onboarding', 'Mi Sitio')
        ) : (
          <>
            {navItem('/collections', 'Content Manager')}
            {navItem('/analytics', 'Analytics', 'beta')}
            {navItem('/requests', 'Pedidos de cambios')}
          </>
        )}
      </nav>

      <div className="px-3 pt-4 border-t border-neutral-800">
        <LogoutButton />
      </div>
    </aside>
  )

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-14 bg-neutral-950 border-b border-neutral-800">
        <button
          onClick={() => setIsOpen(true)}
          className="text-neutral-400 hover:text-white transition p-1"
          aria-label="Abrir menú"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <img src="/isologo.png" alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
        <span style={{ fontFamily: 'Cal Sans, sans-serif', fontSize: 15 }}>Softwind</span>
      </div>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setIsOpen(false)}
        />
      )}

      {sidebar}
    </>
  )
}
