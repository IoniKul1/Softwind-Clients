'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteRequestButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) return
    setLoading(true)
    await fetch(`/api/requests?id=${id}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-neutral-700 hover:text-red-500 transition text-xs disabled:opacity-40"
    >
      {loading ? '...' : 'Eliminar'}
    </button>
  )
}
