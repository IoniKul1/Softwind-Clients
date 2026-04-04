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

  const minRectSize = 2 // minimum % size

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setDragging(true)
    setDragStart({ x, y })
    setDragCurrent({ x, y })
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setDragCurrent({ x, y })
  }

  function handleMouseUp() {
    if (!dragging) return
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
    const newAnnotation: Annotation = {
      id: Math.random().toString(36).slice(2),
      ...pendingAnnotation,
      label: pendingLabel.trim(),
    }
    onChange([...annotations, newAnnotation])
    setPendingAnnotation(null)
    setPendingLabel('')
  }

  function deleteAnnotation(id: string) {
    onChange(annotations.filter(a => a.id !== id))
  }

  const liveRect = dragging
    ? {
        x: Math.min(dragStart.x, dragCurrent.x),
        y: Math.min(dragStart.y, dragCurrent.y),
        w: Math.abs(dragCurrent.x - dragStart.x),
        h: Math.abs(dragCurrent.y - dragStart.y),
      }
    : null

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden select-none max-w-lg"
        style={{ cursor: dragging ? 'crosshair' : 'pointer' }}
      >
        <img src={imageUrl} alt="annotate" className="w-full h-auto block" />

        {/* Existing annotations */}
        {annotations.map((ann, idx) => (
          <div key={ann.id} className="absolute group" style={{ left: `${ann.x}%`, top: `${ann.y}%`, width: `${ann.w}%`, height: `${ann.h}%` }}>
            <div className="w-full h-full border-2 border-dashed border-yellow-400 pointer-events-none" />
            <div className="absolute top-0 left-0 w-5 h-5 bg-yellow-400 text-neutral-950 text-xs font-bold flex items-center justify-center rounded-full">
              {idx + 1}
            </div>
            <button
              type="button"
              onClick={() => deleteAnnotation(ann.id)}
              className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs hidden group-hover:flex items-center justify-center rounded-full"
            >
              ×
            </button>
            <div className="absolute top-6 left-0 bg-neutral-800 text-xs text-neutral-100 px-2 py-1 rounded whitespace-nowrap hidden group-hover:block z-10 pointer-events-none">
              {ann.label}
            </div>
          </div>
        ))}

        {/* Live drag rect */}
        {liveRect && (
          <div className="absolute pointer-events-none" style={{ left: `${liveRect.x}%`, top: `${liveRect.y}%`, width: `${liveRect.w}%`, height: `${liveRect.h}%` }}>
            <div className="w-full h-full border-2 border-dashed border-blue-400" />
          </div>
        )}
      </div>

      {/* Pending annotation input */}
      {pendingAnnotation && (
        <div className="flex gap-2">
          <input
            type="text"
            value={pendingLabel}
            onChange={e => setPendingLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAnnotation()}
            placeholder="Describí qué está mal aquí..."
            autoFocus
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-neutral-500 transition placeholder:text-neutral-600"
          />
          <button
            type="button"
            onClick={addAnnotation}
            disabled={!pendingLabel.trim()}
            className="px-3 py-2 bg-yellow-400 text-neutral-950 text-xs font-medium rounded-lg disabled:opacity-50 hover:bg-yellow-300 transition"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => setPendingAnnotation(null)}
            className="px-3 py-2 border border-neutral-700 text-neutral-300 text-xs rounded-lg hover:border-neutral-500 transition"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
