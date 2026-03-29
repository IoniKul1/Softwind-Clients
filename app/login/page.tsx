'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Email o contraseña incorrectos')
    } else {
      router.refresh()
      router.push('/')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
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
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="py-3 bg-white text-black font-medium rounded-full text-sm disabled:opacity-30 hover:bg-neutral-200 transition"
        >
          {loading ? 'Entrando...' : 'Entrar →'}
        </button>
      </form>
    </main>
  )
}
