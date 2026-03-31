'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RequestStatusButton({
  requestId, nextStatus, label, isDone,
}: {
  requestId: string
  nextStatus: string
  label: string
  isDone: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    await fetch(`/api/admin/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-40 ${
        isDone
          ? 'border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400'
          : 'border-brand/30 text-brand hover:bg-brand hover:text-white'
      }`}
    >
      {loading ? '...' : label}
    </button>
  )
}
