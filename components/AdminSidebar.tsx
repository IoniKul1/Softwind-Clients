'use client'
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

  // Detect active client from path /admin/clients/[id]/...
  const activeClientId = pathname.match(/\/admin\/clients\/([^/]+)/)?.[1] ?? null

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-neutral-800 min-h-screen px-4 py-6">
      {/* Logo */}
      <div className="mb-8 px-1 flex items-center gap-2">
        <img src="/isologo.png" alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
        <span style={{ fontFamily: 'Cal Sans, sans-serif', fontSize: 16 }}>Softwind</span>
      </div>

      {/* Label */}
      <p className="text-[10px] uppercase tracking-widest text-neutral-600 px-1 mb-2">Clientes</p>

      {/* Client list */}
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

              {/* Sub-items when client is active */}
              {isActive && (
                <div className="ml-4 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-neutral-800 pl-3">
                  <Link
                    href={`/admin/clients/${client.id}/collections`}
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

      {/* New client */}
      <div className="pt-4 border-t border-neutral-800">
        <Link
          href="/admin/clients/new"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-500 hover:text-white hover:bg-neutral-900 transition w-full"
        >
          <span className="text-lg leading-none">+</span>
          <span>Nuevo cliente</span>
        </Link>
      </div>
    </aside>
  )
}
