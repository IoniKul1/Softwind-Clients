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
    <main className="min-h-screen flex items-center justify-center px-6">
      {sent ? (
        <div className="flex flex-col gap-3 w-full max-w-xs text-center">
          <h1 className="text-xl font-semibold">Softwind</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Te enviamos un link de acceso a <span className="text-white">{email}</span>.
            Revisá tu bandeja de entrada.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
          <div className="mb-2">
            <h1 className="text-xl font-semibold">Softwind</h1>
            <p className="text-neutral-500 text-sm mt-1">Ingresá con tu cuenta</p>
          </div>
          <input
            type="email"
            placeholder="Email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email}
            className="py-3 bg-white text-black font-medium rounded-full text-sm disabled:opacity-30 hover:bg-neutral-200 transition"
          >
            {loading ? 'Enviando...' : 'Enviar link →'}
          </button>
        </form>
      )}
    </main>
  )
}
