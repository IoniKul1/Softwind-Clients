'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  label: string
  href: string
  match: string
}

export default function ClientTabNav({ clientId }: { clientId: string }) {
  const pathname = usePathname()

  const tabs: Tab[] = [
    { label: 'Configuración', href: `/admin/clients/${clientId}`, match: 'exact' },
    { label: 'Onboarding', href: `/admin/clients/${clientId}/onboarding`, match: '/onboarding' },
    { label: 'Content Manager', href: `/admin/clients/${clientId}/collections`, match: '/collections' },
    { label: 'Analytics', href: `/admin/clients/${clientId}/analytics`, match: '/analytics' },
    { label: 'Pedidos', href: `/admin/clients/${clientId}/requests`, match: '/requests' },
  ]

  function isActive(tab: Tab) {
    if (tab.match === 'exact') return pathname === `/admin/clients/${clientId}`
    return pathname.includes(tab.match)
  }

  return (
    <nav className="flex gap-1 border-b border-neutral-800 -mx-0">
      {tabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-4 py-2 text-sm rounded-t-lg transition border-b-2 -mb-px ${
            isActive(tab)
              ? 'text-white border-brand font-medium'
              : 'text-neutral-500 border-transparent hover:text-neutral-300 hover:border-neutral-600'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
