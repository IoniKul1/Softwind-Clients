import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <Image src="/isologo.png" alt="Softwind" width={32} height={32} className="rounded-full" />
          <span className="text-sm font-medium text-neutral-400">Admin</span>
        </div>
        <Link href="/admin/clients/new"
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-full hover:bg-brand-hover transition">
          + Nuevo cliente
        </Link>
      </div>
      {children}
    </div>
  )
}
