// app/completed/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CompletedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('name, website_url')
    .eq('client_user_id', user.id)
    .maybeSingle()

  const websiteUrl = project?.website_url ?? null
  const projectName = project?.name ?? 'Tu sitio'

  return (
    <div className="max-w-lg w-full text-center flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4">
        <img src="/isologo.png" alt="Softwind" className="w-12 h-12 rounded-full" />
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">¡Listo!</h1>
          <p className="text-neutral-400 text-base">
            El desarrollo de <span className="text-white font-medium">{projectName}</span> está completado.
          </p>
        </div>
      </div>

      {websiteUrl && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-neutral-500 uppercase tracking-widest">Tu sitio está publicado en</p>
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg text-indigo-400 hover:text-indigo-300 transition font-medium break-all"
          >
            {websiteUrl.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 pt-4 border-t border-neutral-800 w-full">
        <p className="text-sm text-neutral-400">¿Tenés alguna consulta?</p>
        <a
          href="https://wa.me/5491170661032"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-full transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.12 1.519 5.854L.057 23.882a.5.5 0 0 0 .61.61l6.083-1.456A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.933 0-3.737-.516-5.29-1.415l-.38-.22-3.613.864.876-3.546-.24-.389A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Escribinos al WhatsApp
        </a>
        <p className="text-xs text-neutral-600">+54 9 11 7066-1032</p>
      </div>
    </div>
  )
}
