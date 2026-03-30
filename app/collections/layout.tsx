import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function CollectionsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-lg font-semibold">Hola, {profile?.name ?? 'Cliente'}</h1>
          <p className="text-neutral-500 text-sm mt-1">Tu contenido</p>
        </div>
        <LogoutButton />
      </div>
      {children}
    </div>
  )
}
