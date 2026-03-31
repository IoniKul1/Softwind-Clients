import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function CollectionsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: projectRows }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('projects').select('website_url').eq('client_user_id', user.id),
  ])

  const websiteUrl = projectRows?.[0]?.website_url ?? null
  const domain = websiteUrl ? websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : null

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <Image src="/isologo.png" alt="Softwind" width={32} height={32} className="rounded-full" />
          <div>
            <h1 className="text-sm font-medium leading-tight">Hola, {profile?.name ?? 'Cliente'}</h1>
            <p className="text-neutral-500 text-xs mt-0.5">Website Content Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {domain && (
            <a
              href={websiteUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              {domain}
            </a>
          )}
          <LogoutButton />
        </div>
      </div>
      {children}
    </div>
  )
}
