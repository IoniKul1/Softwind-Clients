'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Client {
  id: string
  name: string
  email: string
  projectName: string | null
}

export default function AdminSidebar({ clients }: { clients: Client[] }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const activeClientId = pathname.match(/\/admin\/clients\/([^/]+)/)?.[1] ?? null

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
      {/* Close button (mobile only) */}
      <button
        className="md:hidden absolute top-4 right-4 text-neutral-500 hover:text-white text-xl leading-none"
        onClick={() => setIsOpen(false)}
      >
        ×
      </button>

      {/* Logo */}
      <div className="mb-8 px-1 flex items-center gap-2">
        <img src="/isologo.png" alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
        <span style={{ fontFamily: 'Cal Sans, sans-serif', fontSize: 16 }}>Softwind</span>
      </div>

      {/* Global nav */}
      <nav className="flex flex-col gap-0.5 mb-4">
        <Link
          href="/admin/requests"
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
            pathname === '/admin/requests'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <rect x="1" y="1" width="4" height="14" rx="1.5" fill="currentColor" opacity=".4"/>
            <rect x="6" y="1" width="4" height="10" rx="1.5" fill="currentColor" opacity=".7"/>
            <rect x="11" y="1" width="4" height="7" rx="1.5" fill="currentColor"/>
          </svg>
          <span>Pedidos</span>
        </Link>
      </nav>

      <div className="border-t border-neutral-800 mb-4" />

      <p className="text-[10px] uppercase tracking-widest text-neutral-600 px-1 mb-2">Clientes</p>

      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {clients.length === 0 && (
          <p className="text-xs text-neutral-600 px-1">Sin clientes</p>
        )}
        {clients.map((client) => {
          const isActive = activeClientId === client.id
          return (
            <div key={client.id}>
              <Link
                href={`/admin/clients/${client.id}`}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition w-full ${
                  isActive
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${isActive ? 'bg-brand' : 'bg-neutral-700'}`} />
                <span className="flex flex-col min-w-0">
                  <span className="text-sm truncate leading-tight">{client.projectName ?? client.name}</span>
                  {client.projectName && (
                    <span className="text-[11px] text-neutral-600 truncate leading-tight">{client.name}</span>
                  )}
                </span>
              </Link>

              {isActive && (
                <div className="ml-4 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-neutral-800 pl-3">
                  <Link
                    href={`/admin/clients/${client.id}/onboarding`}
                    onClick={() => setIsOpen(false)}
                    className={`text-xs py-1.5 px-2 rounded-md transition ${
                      pathname.includes('/onboarding')
                        ? 'text-white bg-neutral-800'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    Onboarding
                  </Link>
                  <Link
                    href={`/admin/clients/${client.id}/collections`}
                    onClick={() => setIsOpen(false)}
                    className={`text-xs py-1.5 px-2 rounded-md transition ${
                      pathname.includes('/collections')
                        ? 'text-white bg-neutral-800'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    Content Manager
                  </Link>
                  <Link
                    href={`/admin/clients/${client.id}/analytics`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-md transition ${
                      pathname.includes('/analytics')
                        ? 'text-white bg-neutral-800'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    Analytics
                    <span className="text-[9px] px-1 py-0.5 rounded bg-neutral-700 text-neutral-400">beta</span>
                  </Link>
                  <Link
                    href={`/admin/clients/${client.id}/requests`}
                    onClick={() => setIsOpen(false)}
                    className={`text-xs py-1.5 px-2 rounded-md transition ${
                      pathname.includes('/requests')
                        ? 'text-white bg-neutral-800'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    Pedidos
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="pt-4 border-t border-neutral-800">
        <Link
          href="/admin/clients/new"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-500 hover:text-white hover:bg-neutral-900 transition w-full"
        >
          <span className="text-lg leading-none">+</span>
          <span>Nuevo cliente</span>
        </Link>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile top bar */}
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

      {/* Backdrop */}
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
