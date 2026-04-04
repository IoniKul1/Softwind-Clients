import AnnotatedImage from './AnnotatedImage'

interface Annotation {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
}

interface Attachment {
  url: string
  name: string
  type: 'image' | 'file'
  annotations?: Annotation[]
}

export default function AttachmentPreview({ attachments }: { attachments: Attachment[] }) {
  if (!attachments?.length) return null
  return (
    <div className="flex flex-wrap gap-4 mt-3">
      {attachments.map((a, i) =>
        a.type === 'image' ? (
          <AnnotatedImage key={i} url={a.url} name={a.name} annotations={a.annotations} />
        ) : (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-800 hover:border-neutral-600 transition text-xs text-neutral-400"
          >
            <span>📄</span>
            <span className="max-w-[120px] truncate">{a.name}</span>
          </a>
        )
      )}
    </div>
  )
}
