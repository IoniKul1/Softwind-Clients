'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

interface Props {
  name: string
  websiteUrl?: string | null
}

export default function ClientSidebar({ name, websiteUrl }: Props) {
  const pathname = usePathname()
  const domain = websiteUrl ? websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : null

  const navItem = (href: string, label: string, badge?: string) => {
    const active = pathname === href || (href !== '/collections' && pathname.startsWith(href))
    return (
      <Link
        href={href}
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

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-neutral-800 min-h-screen px-4 py-6">
      {/* Logo */}
      <div className="mb-8 px-1">
        <img src="/logo.png" alt="Softwind" style={{ height: 22, width: 'auto' }} />
      </div>

      {/* User */}
      <div className="px-1 mb-6">
        <p className="text-xs font-medium text-white leading-tight truncate">{name}</p>
        {domain && (
          <a
            href={websiteUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 mt-1 group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300 transition truncate">{domain}</span>
          </a>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItem('/collections', 'Content Manager')}
        {navItem('/analytics', 'Analytics', 'beta')}
      </nav>

      {/* Logout */}
      <div className="px-3 pt-4 border-t border-neutral-800">
        <LogoutButton />
      </div>
    </aside>
  )
}
