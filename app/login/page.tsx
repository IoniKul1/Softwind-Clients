'use client'
import { useState, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    })
    setLoading(false)
    if (error) {
      setError('No encontramos una cuenta con ese email. Contactá a tu administrador.')
    } else {
      setSent(true)
    }
  }

  return (
    <main className="min-h-screen flex">
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 px-12 py-12"
        style={{ background: 'linear-gradient(135deg, #17182A 0%, #0f1020 60%, #1a1f3a 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/isologo.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          <span style={{ fontFamily: 'Cal Sans, sans-serif', fontSize: 20, color: 'white' }}>Softwind</span>
        </div>

        {/* Center content */}
        <div>
          <p
            className="text-5xl leading-tight text-white"
            style={{ fontFamily: 'Cal Sans, sans-serif' }}
          >
            Tu sitio web,<br />siempre actualizado.
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          <span className="text-xs text-neutral-600">Website Content Manager</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-brand-black">
        {sent ? (
          <div className="flex flex-col gap-4 w-full max-w-sm text-center">
            <div className="lg:hidden flex justify-center items-center gap-2 mb-4">
              <img src="/isologo.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              <span style={{ fontFamily: 'Cal Sans, sans-serif', fontSize: 18 }}>Softwind</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <span className="text-green-400 text-lg">✓</span>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Revisá tu email</p>
              <p className="text-neutral-500 text-sm">
                Te enviamos un link de acceso a{' '}
                <span className="text-neutral-300">{email}</span>
              </p>
            </div>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-xs text-neutral-600 hover:text-neutral-400 transition mt-2"
            >
              Usar otro email
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center items-center gap-2 mb-8">
              <img src="/isologo.png" alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
              <span style={{ fontFamily: 'Cal Sans, sans-serif', fontSize: 18 }}>Softwind</span>
            </div>

            <div className="mb-8">
              <h1
                className="text-2xl text-white mb-1.5"
                style={{ fontFamily: 'Cal Sans, sans-serif' }}
              >
                Bienvenido
              </h1>
              <p className="text-neutral-500 text-sm">Ingresá tu email para recibir tu link de acceso.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-500">Email</label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-700 outline-none focus:border-neutral-600 transition"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="py-3 bg-brand text-white font-medium rounded-xl text-sm disabled:opacity-30 hover:bg-brand-hover transition mt-1"
              >
                {loading ? 'Enviando...' : 'Enviar link de acceso →'}
              </button>
            </form>

            <p className="text-neutral-700 text-xs text-center mt-8">
              ¿No tenés cuenta? Contactá a tu administrador.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
