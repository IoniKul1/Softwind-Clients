interface Annotation {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
}

interface AnnotatedImageProps {
  url: string
  name: string
  annotations?: Annotation[]
  onEdit?: () => void
}

export default function AnnotatedImage({ url, name, annotations, onEdit }: AnnotatedImageProps) {
  const hasAnnotations = annotations && annotations.length > 0

  const handleClick = () => {
    if (onEdit) {
      onEdit()
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative inline-block group text-left hover:opacity-80 transition"
    >
      <div className="relative inline-block w-full rounded-lg border border-neutral-800 overflow-hidden max-w-sm bg-neutral-900">
        <img src={url} alt={name} className="w-full h-auto block" />

        {/* Annotations overlay */}
        {hasAnnotations && (
          <div className="absolute inset-0 pointer-events-none">
            {annotations.map((ann, idx) => (
              <div key={ann.id} className="absolute group/ann" style={{ left: `${ann.x}%`, top: `${ann.y}%`, width: `${ann.w}%`, height: `${ann.h}%` }}>
                <div className="w-full h-full border-2 border-dashed border-yellow-400" />
                <div className="absolute top-0 left-0 w-5 h-5 bg-yellow-400 text-neutral-950 text-xs font-bold flex items-center justify-center rounded-full">
                  {idx + 1}
                </div>
                <div className="absolute top-6 left-0 bg-neutral-800 text-xs text-neutral-100 px-2 py-1 rounded whitespace-nowrap hidden group-hover/ann:block z-10">
                  {ann.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="text-xs text-neutral-500 mt-1 group-hover:text-neutral-400 transition">{name}</div>
    </button>
  )
}
