import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-lg font-semibold">Softwind Admin</h1>
        <Link href="/admin/clients/new"
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full hover:bg-neutral-200 transition">
          + Nuevo cliente
        </Link>
      </div>
      {children}
    </div>
  )
}
