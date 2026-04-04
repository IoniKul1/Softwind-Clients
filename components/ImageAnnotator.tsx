'use client'
import { useState, useRef } from 'react'

interface Annotation {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
}

interface ImageAnnotatorProps {
  imageUrl: string
  annotations: Annotation[]
  onChange: (annotations: Annotation[]) => void
}

export default function ImageAnnotator({ imageUrl, annotations, onChange }: ImageAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 })
  const [pendingAnnotation, setPendingAnnotation] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')

  const minRectSize = 2

  function getRelativePos(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return
    // Ignore clicks on buttons inside the overlay
    if ((e.target as HTMLElement).closest('button,input')) return
    e.preventDefault()
    const pos = getRelativePos(e)
    setDragging(true)
    setDragStart(pos)
    setDragCurrent(pos)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging) return
    e.preventDefault()
    setDragCurrent(getRelativePos(e))
  }

  function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging) return
    e.preventDefault()
    setDragging(false)
    const x = Math.min(dragStart.x, dragCurrent.x)
    const y = Math.min(dragStart.y, dragCurrent.y)
    const w = Math.abs(dragCurrent.x - dragStart.x)
    const h = Math.abs(dragCurrent.y - dragStart.y)
    if (w > minRectSize && h > minRectSize) {
      setPendingAnnotation({ x, y, w, h })
      setPendingLabel('')
    }
  }

  function addAnnotation() {
    if (!pendingAnnotation || !pendingLabel.trim()) return
    onChange([...annotations, {
      id: Math.random().toString(36).slice(2),
      ...pendingAnnotation,
      label: pendingLabel.trim(),
    }])
    setPendingAnnotation(null)
    setPendingLabel('')
  }

  function cancelPending() {
    setPendingAnnotation(null)
    setPendingLabel('')
  }

  function deleteAnnotation(id: string) {
    onChange(annotations.filter(a => a.id !== id))
  }

  const liveRect = dragging ? {
    x: Math.min(dragStart.x, dragCurrent.x),
    y: Math.min(dragStart.y, dragCurrent.y),
    w: Math.abs(dragCurrent.x - dragStart.x),
    h: Math.abs(dragCurrent.y - dragStart.y),
  } : null

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => dragging && setDragging(false)}
      className="relative bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden select-none max-w-lg"
      style={{ cursor: pendingAnnotation ? 'default' : dragging ? 'crosshair' : 'crosshair' }}
    >
      {/* Image — not draggable, not selectable */}
      <img
        src={imageUrl}
        alt="annotate"
        draggable={false}
        onDragStart={e => e.preventDefault()}
        className="w-full h-auto block pointer-events-none"
      />

      {/* Existing annotations */}
      {annotations.map((ann, idx) => (
        <div
          key={ann.id}
          className="absolute group"
          style={{ left: `${ann.x}%`, top: `${ann.y}%`, width: `${ann.w}%`, height: `${ann.h}%` }}
        >
          <div className="w-full h-full border-2 border-dashed border-white/80 pointer-events-none" />
          <div className="absolute -top-2 -left-2 w-5 h-5 bg-white text-neutral-950 text-xs font-bold flex items-center justify-center rounded-full shadow">
            {idx + 1}
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); deleteAnnotation(ann.id) }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs hidden group-hover:flex items-center justify-center rounded-full shadow"
          >
            ×
          </button>
          <div className="absolute top-5 left-0 bg-black/80 text-xs text-white px-2 py-1 rounded whitespace-nowrap hidden group-hover:block z-10 pointer-events-none">
            {ann.label}
          </div>
        </div>
      ))}

      {/* Live drag rect */}
      {liveRect && (
        <div
          className="absolute pointer-events-none"
          style={{ left: `${liveRect.x}%`, top: `${liveRect.y}%`, width: `${liveRect.w}%`, height: `${liveRect.h}%` }}
        >
          <div className="w-full h-full border-2 border-dashed border-white/80" />
        </div>
      )}

      {/* Pending input — inside the image at the bottom */}
      {pendingAnnotation && (
        <div className="absolute bottom-3 left-3 right-3 z-20">
          <div className="flex items-center gap-2 bg-neutral-900/90 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-neutral-700/60">
            <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-base shrink-0 font-light">
              +
            </span>
            <input
              type="text"
              value={pendingLabel}
              onChange={e => setPendingLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); addAnnotation() } if (e.key === 'Escape') cancelPending() }}
              placeholder="Describe edits"
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500 text-neutral-100"
            />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); cancelPending() }}
              className="w-7 h-7 rounded-full bg-neutral-700 text-neutral-300 flex items-center justify-center text-sm shrink-0 hover:bg-neutral-600 transition"
            >
              🗑
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); addAnnotation() }}
              disabled={!pendingLabel.trim()}
              className="w-7 h-7 rounded-full bg-yellow-400 text-neutral-950 flex items-center justify-center font-bold shrink-0 disabled:opacity-40 hover:bg-yellow-300 transition"
            >
              ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
